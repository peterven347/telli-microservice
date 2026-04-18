import mongoose, { Model } from 'mongoose';
import { Injectable, Inject, Param, Query } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectModel } from '@nestjs/mongoose';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { Domain } from "@app/schemas/chat.schema"
import { Sector } from '@app/schemas/sector.schema';
import { SocketGateway } from 'apps/socket/socket.service';
import { REDIS_CLIENT } from 'apps/redis/redis.constants';

function regexQuery(string: string) {
    const escapeRegex = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(escapeRegex, 'i');
};

function cleanPhoneNumber(input: string) {
    const number = input.trim().replace(/\D/g, '');
    for (const i of []) {
        if (number.startsWith(i)) {
            return number.replace(i, '');
        }
    }
    if (number.startsWith("0")) {
        return number.slice(1);
    }
    return number;
};


@Injectable()
export class ChatService {
    constructor(
        @InjectModel(Domain.name) private chatModel: Model<Domain>,
        @InjectModel(Sector.name) private sectorModel: Model<Sector>,
        @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
        private readonly socketGateWay: SocketGateway,
        private readonly httpService: HttpService,
    ) { }

    async emitNewDomainCreated(socketId: string, data: any) {
        this.socketGateWay.emitToSocket(socketId, 'new-domain', data);
    }
    async emitNewSectorCreated(socketId: string, data: any) {
        this.socketGateWay.emitToSocket(socketId, 'new-sector', data);
    }
    async joinRoom(id: string, roomName: string) {
        this.socketGateWay.getSocketsByUserIdandJoinRoom(id, roomName);
    }

    async getDelegates(delegates: string, id: string) {
        const isNumeric = (i: string) => /^\+?\d+$/.test(i)
        const _delegates = delegates.split(",")
        const delegateList: string[] = []
        let delegateFcmToken: string[] = []
        for (let i of _delegates) {

    const user = (
        await lastValueFrom(
            this.httpService.get(`http://localhost:3004/find-one`,
                {
            params: isNumeric(i) ? { phone_number: cleanPhoneNumber(i) } : { email: i },
            }),
        )
        ).data

    if (user && user._id !== id) {
                delegateList.push(user._id)
                delegateFcmToken = delegateFcmToken.concat(user?.fcmTokens)
            }
        }
        return ({ delegateList: delegateList, delegateFcmToken: delegateFcmToken })
    };

    async getDomain(userId: string) {
        try {
            const response = await lastValueFrom(
            this.httpService.get(
                `http://localhost:3004/find-one`,
                {
                params: {
                    id: userId,
                    select: '-fcmTokens',
                },
                },
            ),
            );

            const user = response.data;
            if (!user) return { success: false, message: "user not found" }
            const sectors = await this.sectorModel.find({ $or: [{ _id: { $in: user.sectors } }, { creator_id: user._id }] })
            const domainId = [...new Set(sectors.map(i => i.domain_id.toString()))]
            const domain = await this.chatModel.aggregate([
                {
                    $match: {
                        _id: { $in: domainId.map(id => new mongoose.Types.ObjectId(id)) }
                    }
                },
                {
                    $lookup: {
                        from: 'sectors',
                        localField: '_id', //sector or sectors ._id
                        foreignField: 'domain_id',
                        as: 'sectors',
                    }
                },
                {
                    $addFields: {
                        sectors: {
                            $filter: {
                                input: '$sectors',
                                as: 'sector',
                                cond: {
                                    $or: [
                                        { $in: ['$$sector._id', user.sectors] },
                                        { $eq: ['$$sector.creator_id', user._id] }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $unwind: '$sectors'
                },
                {
                    $lookup: {
                        from: 'issues',
                        localField: 'sectors._id', //not _id?? 
                        foreignField: 'sector_id',
                        as: 'sectors.data'
                    }
                },
                {
                    $set: {
                        'sectors.data': { $reverseArray: '$sectors.data' }
                    }
                },
                {
                    $group: {
                        _id: '$_id',
                        mergedFields: { $mergeObjects: '$$ROOT' },
                        sectors: { $push: '$sectors' }
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: ['$mergedFields', { sectors: '$sectors' }]
                        }
                    }
                }
            ]);
            return { success: true, domain: domain }
        } catch (err) {
            console.log(err)
            return { success: false, message: "an error occured" }
        }
    };

    async getDomainBySector(sectorId: string, userId: string) {
        try {
            const response = await lastValueFrom(
            this.httpService.get(
                `http://localhost:3004/find-one`,
                {
                params: {
                    id: userId,
                    select: '-fcmTokens',
                },
                },
            ),
            );

            const user = response.data;
            if (!user) return { success: false, message: "no user found" }
            const sectors = await this.sectorModel.findOne({
                $and: [{ _id: sectorId }, { _id: { $nin: user.sectors }, status: "public" }]
            });
            const domain = await this.chatModel.aggregate([
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(sectors?.domain_id)
                    }
                },
                {
                    $lookup: {
                        from: 'sectors',
                        localField: '_id',
                        foreignField: 'domain_id',
                        as: 'sectors',
                    }
                },
                {
                    $addFields: {
                        sectors: {
                            $filter: {
                                input: '$sectors',
                                as: 'sector',
                                cond: {
                                    $and: [
                                        // { $in: ['$$sector._id', user.sectors] }, //uncomment, needed
                                        { $eq: ['$$sector._id', new mongoose.Types.ObjectId(sectorId)] }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $unwind: '$sectors'
                },
                {
                    $lookup: {
                        from: 'issues',
                        localField: 'sectors._id',
                        foreignField: 'sector_id',
                        as: 'sectorIssues'
                    }
                },
                {
                    $set: {
                        'time': Date.now(),
                        'sectors.data': '$sectorIssues'
                        // 'sectors.data': { $reverseArray: '$sectorIssues' }
                    }
                },
                {
                    $unset: 'sectorIssues'
                }
            ]);

            return { success: true, data: domain, sector: sectors }
        } catch (err) {
            console.log(err)
            return { success: false, message: "an error occured" }
        }
    };

    async findSector(sectorTitle: string, userId: string) {
        try {
            const response = await lastValueFrom(
            this.httpService.get(
                `http://localhost:3004/find-one`,
                {
                params: {
                    id: userId,
                    select: 'sectors',
                },
                },
            ),
            );

            const user = response.data;
            if (!user) return { success: false, message: "no user" }
                        if (!sectorTitle) return { success: false, message: "no title" }
                        const sectors = await this.sectorModel.find({
                            $and: [
                                { _id: { $nin: user.sectors } },
                                { creator_id: { $ne: user._id } },
                                { status: "public" },
                                { title: { $regex: regexQuery(sectorTitle) } }
                            ]
                        }).limit(20).lean()
                        return { success: true, data: sectors }
                    } catch (err) {
                        console.log(err)
                    }
                };

    async createDomain(payload: any, userId: string) {
        const { domainName, status, title, delegates, file } = payload
        try {
            const response = await lastValueFrom(
            this.httpService.get(
                `http://localhost:3004/find-one`,
                {
                params: {
                    id: userId,
                    select: '',
                },
                },
            ),
            );

            const user = response.data;
            if (!user) return { success: false, message: "no user" }
            const newDomain = new this.chatModel({
                name: domainName.trim(),
                creator_id: user._id,
                img: file?.filename,
            })

            const savedDomain = await newDomain.save()
            const newSector = await this.sectorModel.create({
                domain_id: savedDomain._id,
                creator_id: user._id,
                title: title,
                status: status,
                //link: 
                img: file?.filename,
                members: [{ _id: user._id, role: "admin", public_key: "key" }]
            })
            //  store sector on redis
            if (status === "private") {
                const { delegateList, delegateFcmToken } = await this.getDelegates(delegates, user.id)
                if (delegateList.length === 0) {
                    return { success: false, message: "add at least one valid delegate" }
                }
                await this.httpService.patch(
                    `http://localhost:3004/update-many`,
                    {
                    filter: { _id: { $in: delegateList } },
                    update: {
                        $addToSet: {
                        sectors: newSector._id,
                        },
                    },
                    },
                );
  
                const message = {
                    tokens: delegateFcmToken.flat(),
                    notification: {
                        title: "Telli",
                        body: `You have been added to ${title} of (${domainName})`,
                    },
                    data: { domain: JSON.stringify({}) }, // [0]??
                }
                // await fadmin.messaging().sendEachForMulticast(message);

                const socketIds = await this.redisClient.hmget("userSockets", ...delegateList);
                socketIds.forEach((id: any) => {
                    if (!id) return
                    this.emitNewDomainCreated(id, {})
                    this.joinRoom(id, newSector.id)
                });
            }
            return {
                success: true,
                    domain: savedDomain,
                    sector: newSector,
                    data: {
                        _id: newSector._id,
                        domain_id: savedDomain._id,
                        sector_id: newSector._id,
                        creator_id: user._id,
                        createdAt: Date.now()
                    }
            }
        } catch (err) {
            console.log(err)
            return { success: false, message: "an error occured" }
        }
    };

    async createSector(payload: any) {
        const { domainId, status, title, delegates, file } = payload
        try {
            const response = await lastValueFrom(
            this.httpService.get(
                `http://localhost:3004/find-one`,
                {
                params: {
                    email: "peterolanrewaju22@gmail.com",
                    select: '',
                },
                },
            ),
            );

            const user = response.data;
            const domain: any = await this.chatModel.findById(domainId)
            if (!domain) return { success: false, message: "no domain found" }
            // if (!domain?._id.equals(user?._id)) return { success: false, message: "unauthorised" } //allows only the creator to add more sectors
            const sector = await this.sectorModel.exists({ domain_id: domain.id, title: title })
            if (sector) return { success: false, message: "sector already exists" }
            const newSector = await this.sectorModel.create({
                domain_id: domain._id,
                creator_id: user?._id,
                title: title,
                status: status,
                //link:
                img: file?.filename,
                members: [{ _id: user?._id, role: "admin", public_key: "key" }]
            })
            //  store sector on redis
            if (status === "private") {
                const { delegateList, delegateFcmToken } = await this.getDelegates(delegates, user?.id)
                if (delegateList.length === 0) {
                    return { success: false, message: "add at least one valid delegate" }
                }
                await this.httpService.patch(`http://localhost:3004/update-many`,
                    {
                    filter: { _id: { $in: delegateList } },
                    update: {
                        $addToSet: {
                        sectors: newSector._id,
                        },
                    },
                    },
                );

                const socketIds = await this.redisClient.hmget("userSockets", ...delegateList);
                socketIds.forEach((id: any) => {
                    if (!id) return
                    this.emitNewSectorCreated(id, newSector)
                    this.joinRoom(id, newSector.id)
                });

                const message = {
                    tokens: delegateFcmToken.flat(),
                    notification: {
                        title: "Telli",
                        body: `You have been added to ${newSector.title} of (${domain.domain})`,
                    },
                    data: { sector: JSON.stringify(newSector) },
                }
                // await fadmin.messaging().sendEachForMulticast(message);
            }
            return {
                success: true,
                sector: newSector,
                data: {
                    _id: newSector._id,
                    domain_id: domainId,
                    sector_id: newSector._id,
                    creator_id: user?._id,
                    createdAt: Date.now()
                }
            }
        } catch (err) {
            console.log(err)
            return { success: false, message: "an error occured" }
        }
    };

    async changeDomainHolder(@Param("domain_id") domainId: string, @Query("q") query: any, body: any) {
        query = query.setting.toUpperCase()
        const holder = body.holder
        const setting = `settings.${query}`
        if (!domainId || /^allow-edit$|^allow-add-sector$/.test(query) || /^owner$|^admin$|^everybody$/.test(holder)) {
            return { success: false, message: "incomplete data" }
        }
        try {
            const response = await lastValueFrom(
  this.httpService.get(
    `http://localhost:3004/find-one`,
    {
      params: {
        email: "peterolanrewaju22@gmail.com",
        select: '',
      },
    },
  ),
);

const user = response.data;
            if (!user) return { success: false, message: "user not found" }
            const domain = await this.chatModel.findOneAndUpdate({ _id: domainId, creator_id: user._id }, {
                $set: {
                    [setting]: holder,
                }
            })
            if (!domain) return { success: false, message: "not alowed" }
        } catch (err) {
            console.log(err)
            return { success: false, message: "an error occured" }
        }
    };

    async changeSectorName(sectorId: string, domainId: string, body: any) {
        try {
            const sector = await this.sectorModel.findOne({ sectorId, domainId })
            if (!sector) return { success: false, message: "no sector found" }
            if (sector?.title === body?.title) return { success: false, message: "Plase try a different name" }
            await sector?.updateOne({ title: body?.title })
            return { success: true, "message": "sector updated" }
        } catch (err) {
            console.log(err)
            return { success: false, message: "an error occured" }
        }
    };

    //
    async findByIdDomain(id: string, arg = {}){
        return await this.chatModel.findById(id, arg)
    }

    async findByIdSector(id: string, arg = {}){
        return await this.sectorModel.findById(id)
    }

    async exists(arg){
        return await this.sectorModel.exists(arg)
    }

    async updateOneSector(arg0, arg1){
        return await this.sectorModel.updateOne(arg0, arg1)
    }
    //
}

    // async getMissedMessages(sectorId: string, skip: number) {
    //     try {
    //         const user = await this.userService.findOne({ email: "req.auth.email" }).select("sectors")
    //         if (!user) return { success: false }
    //         const issue = await this.mesageModel.find({
    //             $and: [{
    //                 $or: [
    //                     { sector_id: { $in: user.sectors } },
    //                     { creator_id: user._id }
    //                 ]
    //             }, { sector_id: sectorId }]
    //         }).sort({ _id: 1 }).skip(skip)
    //         return { success: true, data: issue }
    //     } catch (err) {
    //         console.log(err)
    //         return
    //     }
    // }; 


// async createDomain(payload: any) {
    //     const { domainName, status, title, delegates, file } = payload
    //     try {
    //         const user = await this.userService.findOne({ email: "peterolanrewaju22@gmail.com" })
    //         if (!user) return { success: false, message: "no user" }
    //         const newDomain = new this.chatModel({
    //             domain: domainName.trim(),
    //             creator_id: user._id,
    //             logo: file?.filename,
    //         })

    //         const savedDomain = await newDomain.save()
    //         const newSector = await this.sectorModel.create({
    //             domain_id: savedDomain._id,
    //             creator_id: user._id,
    //             title: title,
    //             status: status,
    //             //link: 
    //             logo: file?.filename,
    //             members: [{ _id: user._id, role: "admin", public_key: "key" }]
    //         })
    //         newSector.data = [{ _id: "gen_"+ newSector._id}]
    //         let domainObj: any = savedDomain.toObject()
    //         domainObj.sectors = [newSector]
    //         //  store sector on redis
    //         if (status === "private") {
    //             const { delegateList, delegateFcmToken } = await this.getDelegates(delegates, user._id)
    //             if (delegateList.length === 0) {
    //                 return { success: false, message: "add at least one valid delegate" }
    //             }
    //             await this.userService.updateMany({ _id: { $in: delegateList } }, { $addToSet: { sectors: newSector._id } })
    //             const message = {
    //                 tokens: delegateFcmToken.flat(),
    //                 notification: {
    //                     title: "Telli",
    //                     body: `You have been added to ${title} of (${domainName})`,
    //                 },
    //                 data: { domain: JSON.stringify(domainObj[0]) }, // [0]??
    //             }
    //             // await fadmin.messaging().sendEachForMulticast(message);

    //             const socketIds = await this.redisClient.hmget("userSockets", ...delegateList);
    //             socketIds.forEach((id: string) => {
    //                 if (!id) return
    //                 this.emitNewDomainCreated(id, domainObj)
    //                 this.joinRoom(id, newSector.id)
    //             });
    //         }
    //         console.log(domainObj)
    //         return { success: true, data: domainObj }
    //     } catch (err) {
    //         console.log(err)
    //         return { success: false, message: "an error occured" }
    //     }
    // };