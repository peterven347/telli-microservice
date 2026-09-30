import mongoose, { Model } from 'mongoose';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { Injectable, Inject, Param, Query } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Redis } from 'ioredis';
// import { KafkaProducer } from 'apps/kafka/kafka.producer';
import { Domain } from "./domain.schema"
import { Sector } from './sector.schema';
// import { SocketService } from 'apps/socket/socket.service';
import { SocketPublisherService } from 'libs/socket-publisher/socket-publisher.service';
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";


function regexQuery(string: string) {
    const escapeRegex = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(escapeRegex, 'i');
};

// function cleanPhoneNumber(input: string) {
//     const number = input.trim().replace(/\D/g, '');
//     for (const i of country_dial_codes) {
//         if (number.startsWith(i)) {
//             return number.replace(i, '');
//         }
//     }
//     if (number.startsWith("0")) {
//         return number.slice(1);
//     }
//     return number;
// };

function normalizePhoneNumber(input: string, default_country: CountryCode = "NG"): string | null {
    const phone = parsePhoneNumberFromString(input, default_country);
    if (!phone || !phone.isValid()) {
        return null;
    }
    return phone.number;
};

@Injectable()
export class ChatService {
    constructor(
        @InjectModel(Domain.name) private chatModel: Model<Domain>,
        @InjectModel(Sector.name) private sectorModel: Model<Sector>,
        @Inject("REDIS_CLIENT") private readonly redisClient: Redis,
        // private readonly socketService: SocketService,
        private readonly httpService: HttpService,
        // private readonly kafkaProducer: KafkaProducer,
        private readonly socketPublisher: SocketPublisherService
    ) { }

    // async emitNewDomainCreated(socketId: string, data: any) {
    //     this.socketService.emitToSocket(socketId, 'new-domain', data);
    // }
    // async emitNewSectorCreated(socketId: string, data: any) {
    //     this.socketService.emitToSocket(socketId, 'new-sector', data);
    // }
    // async joinRoom(id: string, roomName: string) {
    //     this.socketService.getSocketsByUserIdandJoinRoom(id, roomName);
    // }


    //replace is numeric with function from libphonenumber..
    // const isNumeric = (i: string) => /^\+?\d+$/.test(i.trim().replace(/\D/g, ''))
    isNumeric = (i: string) => {
        const trimmed = i.trim();
        if (/[a-zA-Z@]/.test(trimmed)) return false;
        return /^\+?[\d\s\-()]+$/.test(trimmed);
    };

    async getDelegates(delegates: string) {
        const _delegates = delegates.split(",")
        const users = (
            await firstValueFrom(
                this.httpService.post(`http://localhost:4004/find-by-list`,
                    {
                        list: _delegates.map(i => this.isNumeric(i) ? normalizePhoneNumber(i) : i)
                    }
                ),
            )).data
        return users
    };

    async getDomain(userId: string) {
        try {
            const response = await lastValueFrom(
                this.httpService.get(
                    `http://localhost:4004/find-one`,
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

    async getSectorDomain(domainId: string, userId: string) {
        try {
            const domain = await this.chatModel.findById(domainId)
            return { success: true, domain: domain }
        } catch (err) {
            console.log(err)
            return { success: false, message: "an error occured" }
        }
    };

    async createDomain(payload: any) {
        const { name, status, title, delegates, userId, userName } = payload
        try {
            const newDomain = new this.chatModel({
                name: name.trim(),
                creator_id: userId,
            })
            const savedDomain: any = await newDomain.save()
            const users = status === "private"
                ? [{ _id: userId, user_name: userName, isAdmin: true }, ...await this.getDelegates(delegates)]
                : [{ _id: userId, user_name: userName, isAdmin: true }]
            const newSector = await this.sectorModel.create({
                domain_id: savedDomain._id,
                creator_id: userId,
                title: title,
                status: status,
                //link: 
                members: status === "private"
                    ? users.map((u) => ({
                        _id: u._id,
                        user_name: u.user_name,
                        isAdmin: u._id.toString() === userId.toString() ? true : false,
                    }))
                    : [{ _id: userId, user_name: userName, isAdmin: true }]
            })
            console.log(users)
            const storedMessage = {
                ACTION: "new-domain",
                domain: savedDomain,
                sector: newSector,
            }
            if (status === "private") {
                if (users?.length === 1) {
                    return { success: false, message: "add at least one valid delegate" }
                }
                await firstValueFrom(this.httpService.patch(`http://localhost:4004/update-many`,
                    { users: users.map(i => i._id), sectorId: newSector._id }
                ))

                // this.kafkaProducer.sendNotification(
                //     "new_domain.notification",
                //     savedDomain._id.toString(),
                //     {
                //         fcmTokens: users.filter(i => i !== userId).map(i => i.fcmTokens.at(-1)),
                //         data: {
                //             domain: savedDomain,
                //             sector: newSector,
                //         }
                //     }
                // )

                // const rawConnectedUsers = await this.redisClient.hmget("connected_users", ...users.map(i => i._id) || []);
                // const parsedConnectedUsers = rawConnectedUsers.map((item: any) => item ? JSON.parse(item) : null)

                for (const user of users.filter(i => i._id !== userId)) {
                    console.log(user._id)
                    const streamKey = `${"new-domain"}:${user._id}`
                    const entryId = await this.redisClient.xadd(
                        streamKey,
                        "MAXLEN",
                        "~",
                        10000,
                        "*",
                        "data",
                        JSON.stringify(storedMessage)
                    );
                    this.socketPublisher.emitToRoom(
                        "new-domain",
                        user._id,
                        { streamKey: streamKey, redisId: entryId, ...storedMessage }
                    )
                }
            }
            return {
                success: true,
                ...storedMessage
            }
        } catch (err) {
            console.log(err)
            return { success: false, message: "an error occured" }
        }
    };

    async exitDomain(payload) {
        const { domainId, userId } = payload
        try {
            const sectorIds = await this.sectorModel.find({ domain_id: domainId }).distinct('_id');
            await firstValueFrom(this.httpService.patch(`http://localhost:4004/exit-domain`,
                { sectorIds, userId }
            ))
            await this.sectorModel.updateMany(
                { domain_id: domainId },
                { $pull: { members: { _id: userId } } }
            );
            const userDataRaw = await this.redisClient.hget('connected_users', userId);
            if (!userDataRaw) return;
            const userData = JSON.parse(userDataRaw);
            userData.sectors = userData.sectors.filter((id) => !sectorIds.includes(id));
            await this.redisClient.hset('connected_users', userId, JSON.stringify(userData));
            return { success: true, message: "removed from domain" }
        } catch (err) {
            console.log(err)
            return { success: false, message: "an error occured" }
        }

    };

    async findSectors(sectorTitle: string, userId: string) {
        try {
            const response = await firstValueFrom(
                this.httpService.get(
                    `http://localhost:4004/find-one/id/${userId}`,
                    {
                        params: {
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

    async createSector(payload: any) {
        const { domainId, status, title, delegates, userId, userName } = payload
        try {
            const domain: any = await this.chatModel.findById(domainId)
            if (!domain) return { success: false, message: "no domain found" }
            // if (!domain?._id.equals(user?._id)) return { success: false, message: "unauthorised" } //allows only the creator to add more sectors
            const sector = await this.sectorModel.exists({ domain_id: domain.id, title: title })
            if (sector) return { success: false, message: "sector already exists" }
            const users = status === "private"
                ? [{ _id: userId, user_name: userName, isAdmin: true }, ...await this.getDelegates(delegates)]
                : [{ _id: userId, user_name: userName, isAdmin: true }]
            const newSector: any = await this.sectorModel.create({
                domain_id: domain._id,
                creator_id: userId,
                title: title.trim(),
                status: status,
                //link:
                members: status === "private"
                    ? users.map((u) => ({
                        _id: u._id,
                        user_name: u.user_name,
                        isAdmin: u._id.toString() === userId.toString() ? true : false,
                    }))
                    : [{ _id: userId, user_name: userName, isAdmin: true }]
            })
            const storedMessage = {
                ACTION: "new-sector",
                domain: domain,
                sector: newSector,
            }
            if (status === "private") {
                if (users?.length === 1) {
                    return { success: false, message: "add at least one valid delegate" }
                }
                await firstValueFrom(this.httpService.patch(`http://localhost:4004/update-many`,
                    { users: users.map(i => i._id), sectorId: newSector._id }
                ))
                for (const user of users.filter(j => j._id !== userId)) {
                    const streamKey = `${"new-sector"}:${user._id}`
                    const entryId = await this.redisClient.xadd(
                        streamKey,
                        "MAXLEN",
                        "~",
                        10000,
                        "*",
                        "data",
                        JSON.stringify(storedMessage)
                    );
                    this.socketPublisher.emitToRoom(
                        "new-sector",
                        user._id,
                        { streamKey: streamKey, redisId: entryId, ...storedMessage }
                    )
                }
            }
            return {
                success: true,
                ...storedMessage
            }
        } catch (err) {
            console.log(err)
            return { success: false, message: "an error occured" }
        }
    };

    async exitSector(payload) {
        const { sectorId, userId } = payload
        try {
            await firstValueFrom(this.httpService.patch(`http://localhost:4004/exit-sector`,
                { sectorId, userId }
            ))
            await this.sectorModel.updateOne(
                { _id: sectorId },
                { $pull: { members: { _id: userId } } }
            )
            const userDataRaw = await this.redisClient.hget('connected_users', userId);
            if (!userDataRaw) return;
            const userData = JSON.parse(userDataRaw);
            userData.sectors = userData.sectors.filter((id) => id !== sectorId);
            await this.redisClient.hset('connected_users', userId, JSON.stringify(userData));
        } catch (err) {
            console.log(err)
        }
    };

    async editDomainImg(@Param("domain_id") domainId: string, @Query("q") query: any, body: any) {
        query = query.setting.toUpperCase()
        const holder = body.holder
        const setting = `settings.${query}`
        // if (!domainId || /^allow-edit$|^allow-add-sector$/.test(query) || /^owner$|^admin$|^everybody$/.test(holder)) {
        //     return { success: false, message: "incomplete data" }
        // }
        try {
            const domain = await this.chatModel.findOneAndUpdate({ _id: domainId }, {
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

    // async editDomainHolder(@Param("domain_id") domainId: string, @Query("q") query: any, body: any) {
    //     query = query.setting.toUpperCase()
    //     const holder = body.holder
    //     const setting = `settings.${query}`
    //     // if (!domainId || /^allow-edit$|^allow-add-sector$/.test(query) || /^owner$|^admin$|^everybody$/.test(holder)) {
    //     //     return { success: false, message: "incomplete data" }
    //     // }
    //     try {
    //         const response = await firstValueFrom(
    //             this.httpService.get(
    //                 `http://localhost:4004/find-one/id/`,
    //                 {
    //                     params: {
    //                         email: "peterolanrewaju22@gmail.com",
    //                         select: '',
    //                     },
    //                 },
    //             ),
    //         );

    //         const user = response.data;
    //         if (!user) return { success: false, message: "user not found" }
    //         const domain = await this.chatModel.findOneAndUpdate({ _id: domainId, creator_id: user._id }, {
    //             $set: {
    //                 [setting]: holder,
    //             }
    //         })
    //         if (!domain) return { success: false, message: "not alowed" }
    //     } catch (err) {
    //         console.log(err)
    //         return { success: false, message: "an error occured" }
    //     }
    // };

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
    async findByIdDomain(id: string, arg = {}) {
        return await this.chatModel.findById(id, arg)
    }

    async findByIdSector(id: string, arg = {}) {
        return await this.sectorModel.findById(id)
    }

    async exists(arg) {
        return await this.sectorModel.exists(arg)
    }

    async updateOneSector(arg0, arg1) {
        return await this.sectorModel.updateOne(arg0, arg1)
    }
    //
}




//     async getDomainBySector(sectorId: string, userId: string) {
//     try {
//         const response = await lastValueFrom(
//             this.httpService.get(
//                 `http://localhost:4004/find-one`,
//                 {
//                     params: {
//                         id: userId,
//                         select: '-fcmTokens',
//                     },
//                 },
//             ),
//         );

//         const user = response.data;
//         if (!user) return { success: false, message: "no user found" }
//         const sectors = await this.sectorModel.findOne({
//             $and: [{ _id: sectorId }, { _id: { $nin: user.sectors }, status: "public" }]
//         });
//         const domain = await this.chatModel.aggregate([
//             {
//                 $match: {
//                     _id: new mongoose.Types.ObjectId(sectors?.domain_id)
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'sectors',
//                     localField: '_id',
//                     foreignField: 'domain_id',
//                     as: 'sectors',
//                 }
//             },
//             {
//                 $addFields: {
//                     sectors: {
//                         $filter: {
//                             input: '$sectors',
//                             as: 'sector',
//                             cond: {
//                                 $and: [
//                                     // { $in: ['$$sector._id', user.sectors] }, //uncomment, needed
//                                     { $eq: ['$$sector._id', new mongoose.Types.ObjectId(sectorId)] }
//                                 ]
//                             }
//                         }
//                     }
//                 }
//             },
//             {
//                 $unwind: '$sectors'
//             },
//             {
//                 $lookup: {
//                     from: 'issues',
//                     localField: 'sectors._id',
//                     foreignField: 'sector_id',
//                     as: 'sectorIssues'
//                 }
//             },
//             {
//                 $set: {
//                     'time': Date.now(),
//                     'sectors.data': '$sectorIssues'
//                     // 'sectors.data': { $reverseArray: '$sectorIssues' }
//                 }
//             },
//             {
//                 $unset: 'sectorIssues'
//             }
//         ]);

//         return { success: true, domain: domain, sector: sectors }
//     } catch (err) {
//         console.log(err)
//         return { success: false, message: "an error occured" }
//     }
// };
