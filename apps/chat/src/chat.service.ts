import { Body, Injectable, Param, Query } from '@nestjs/common';
import { Redis } from 'ioredis';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '@app/schemas/user.schema';
import { Domain } from "@app/schemas/chat.schema"
import { Sector } from '@app/schemas/sector.schema';
import { Message } from '@app/schemas/message.schema';
import { SocketGateway } from 'apps/gateway/src/socket/socket.service';

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
        private readonly redisClient: Redis,
        private readonly socketGateWay: SocketGateway,
        @InjectModel(Domain.name) private chatModel: Model<Domain>,
        @InjectModel(Sector.name) private sectorModel: Model<Sector>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Message.name) private mesageModel: Model<Message>
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


    async getDelegates(delegates: string, id: any) {
        const isNumeric = (i: string) => /^\+?\d+$/.test(i)
        const _delegates = delegates.split(",")
        const delegateList: string[] = []
        let delegateFcmToken: string[] = []
        for (let i of _delegates) {
            const user = isNumeric(i) ? await this.userModel.findOne({ phone_number: cleanPhoneNumber(i) }) : await this.userModel.findOne({ email: i })
            if (user !== null && user.id !== id) {
                delegateList.push(user.id)
                delegateFcmToken = delegateFcmToken.concat(user?.fcmTokens)
            }
        }
        return ({ delegateList: delegateList, delegateFcmToken: delegateFcmToken })
    };

    async getDomain() {
        try {
            const user = await this.userModel.findOne({ email: "peterolanrewaju22@gmail.com" }).select("-fcmTokens")
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

    async getDomainBySector(sectorId: string) {
        try {
            const user = await this.userModel.findOne({ email: "petervenwest1@gmail.com" }).select("-fcmTokens")
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

    async findSector(sectorTitle: string) {
        try {
            const user = await this.userModel.findOne({ email: "peterolanrewaju22@gmail.com" }).select("sectors")
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

    async getMissedMessages(sectorId: string, skip: number) {
        try {
            const user = await this.userModel.findOne({ email: "req.auth.email" }).select("sectors")
            if (!user) return { success: false }
            const issue = await this.mesageModel.find({
                $and: [{
                    $or: [
                        { sector_id: { $in: user.sectors } },
                        { creator_id: user._id }
                    ]
                }, { sector_id: sectorId }]
            }).sort({ _id: 1 }).skip(skip)
            return { success: true, data: issue }
        } catch (err) {
            console.log(err)
            return
        }
    };

    async createDomain(payload: any) {
        const { domainName, status, title, delegates, file } = payload
        try {
            const user = await this.userModel.findOne({ email: "peterolanrewaju22@gmail.com" })
            if (!user) return { success: false, message: "no user" }
            const newDomain = new this.chatModel({
                domain: domainName.trim(),
                creator_id: user._id,
                logo: file?.filename,
            })

            const savedDomain = await newDomain.save()
            const newSector = await this.sectorModel.create({
                domain_id: savedDomain._id,
                creator_id: user._id,
                title: title,
                status: status,
                //link: 
                logo: file?.filename,
                members: [{ _id: user._id, role: "admin", public_key: "key" }]
            })
            let domainObj: any = savedDomain.toObject()
            domainObj.sectors = [newSector]
            //  store sector on redis
            if (status === "private") {
                const { delegateList, delegateFcmToken } = await this.getDelegates(delegates, user._id)
                if (delegateList.length === 0) {
                    return { success: false, message: "add at least one valid delegate" }
                }
                await this.userModel.updateMany({ _id: { $in: delegateList } }, { $addToSet: { sectors: newSector._id } })
                const message = {
                    tokens: delegateFcmToken.flat(),
                    notification: {
                        title: "Telli",
                        body: `You have been added to ${title} of (${domainName})`,
                    },
                    data: { domain: JSON.stringify(domainObj[0]) }, // [0]??
                }
                // await fadmin.messaging().sendEachForMulticast(message);

                const socketIds = await this.redisClient.hmget("userSockets", ...delegateList);
                socketIds.forEach((id: string) => {
                    if (!id) return
                    this.emitNewDomainCreated(id, domainObj)
                    this.joinRoom(id, newSector.id)
                });
            }
            return { success: true, data: domainObj }
        } catch (err) {
            console.log(err)
            return { success: false, message: "an error occured" }
        }
    };

    async createSector(domainId: string, payload: any) {
        const { status, title, delegates, file } = payload
        try {
            const user = await this.userModel.findOne({ email: "req.auth.email" })
            const domain: any = await this.chatModel.findById(domainId)
            if (!domain) return { success: false, message: "no domain found" }
            if (!domain?._id.equals(user?._id)) return { success: false, message: "unauthorised" } //allows only the creator to add more sectors
            const sector = await this.sectorModel.exists({ domain_id: domain._id, title: title })
            if (sector) return { success: false, message: "sector already exists" }
            const newSector = new Sector({
                domain_id: domain._id,
                creator_id: user?._id,
                title: title,
                status: status,
                //link:
                logo: file?.filename,
                members: [{ user: user?._id, role: "admin", public_key: "key" }]
            })
            await newSector.save()
            //  store sector on redis
            if (status === "private") {
                const { delegateList, delegateFcmToken } = await this.getDelegates(delegates, user?._id)
                if (delegateList.length === 0) {
                    return { success: false, message: "add at least one valid delegate" }
                }
                await this.userModel.updateMany({ _id: { $in: delegateList } }, { $addToSet: { sectors: newSector._id } })

                const socketIds = await this.redisClient.hmget("userSockets", ...delegateList);
                socketIds.forEach((id: string) => {
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
            return { success: true, data: newSector }
        } catch (err) {
            console.log(err)
            return { success: false, message: "an error occured" }
        }
    }

    // async sendMessage(){

    // };

    async changeDomainHolder(@Param("domain_id") domainId: string, @Query("q") query: any, body: any) {
        query = query.setting.toUpperCase()
        const holder = body.holder
        const setting = `settings.${query}`
        if (!domainId || /^allow-edit$|^allow-add-sector$/.test(query) || /^owner$|^admin$|^everybody$/.test(holder)) {
            return { success: false, message: "incomplete data" }
        }
        try {
            const user = await this.userModel.findOne({ email: "petervenwest1@gmail.com" })
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

    async test() {
        return { success: true }
    }
}
