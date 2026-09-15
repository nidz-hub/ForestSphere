'use strict';

const { Contract } = require('fabric-contract-api');

class ForestSphereContract extends Contract {

    async CreateEvent(ctx, eventId, eventType, zone, verifiedBy, timestamp, status) {

        const existingEvent = await ctx.stub.getState(eventId);

        if (existingEvent && existingEvent.length > 0) {
            throw new Error(`Event ${eventId} already exists`);
        }

        const event = {
            eventId,
            eventType,
            zone,
            verifiedBy,
            timestamp,
            status
        };

        await ctx.stub.putState(
            eventId,
            Buffer.from(JSON.stringify(event))
        );

        return JSON.stringify(event);
    }

    async ReadEvent(ctx, eventId) {

        const eventData = await ctx.stub.getState(eventId);

        if (!eventData || eventData.length === 0) {
            throw new Error(`Event ${eventId} does not exist`);
        }

        return eventData.toString();
    }

    async GetAllEvents(ctx) {

        const iterator = await ctx.stub.getStateByRange('', '');

        const events = [];

        let result = await iterator.next();

        while (!result.done) {

            if (result.value && result.value.value.toString()) {

                const event = JSON.parse(
                    result.value.value.toString('utf8')
                );

                events.push(event);
            }

            result = await iterator.next();
        }

        await iterator.close();

        return JSON.stringify(events);
    }
}

module.exports = ForestSphereContract;
