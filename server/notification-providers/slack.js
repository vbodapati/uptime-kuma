const NotificationProvider = require("./notification-provider");
const axios = require("axios");
const { setSettings, setting } = require("../util-server");
const { getMonitorRelativeURL, UP, flipStatus, DOWN} = require("../../src/util");
const {R} = require("redbean-node");
const dayjs = require("dayjs");

const duration = require('dayjs/plugin/duration')
const relativeTime = require('dayjs/plugin/relativeTime')

dayjs.extend(duration)
dayjs.extend(relativeTime)


class Slack extends NotificationProvider {

    name = "slack";

    /**
     * Deprecated property notification.slackbutton
     * Set it as primary base url if this is not yet set.
     * @deprecated
     * @param {string} url The primary base URL to use
     * @returns {Promise<void>}
     */
    static async deprecateURL(url) {
        let currentPrimaryBaseURL = await setting("primaryBaseURL");

        if (!currentPrimaryBaseURL) {
            console.log("Move the url to be the primary base URL");
            await setSettings("general", {
                primaryBaseURL: url,
            });
        } else {
            console.log("Already there, no need to move the primary base URL");
        }
    }


    /**
     * @inheritdoc
     */
    async send(notification, msg, monitorJSON = null, heartbeatJSON = null) {
        let okMsg = "Sent Successfully.";

        if (notification.slackchannelnotify) {
            msg += " <!channel>";
        }

        try {

            const title = "Uptime Kuma Alert";

            const message = await Slack.buildMessage(heartbeatJSON, monitorJSON, notification, msg, title);

            //not sure what this does, I think it can be safely removed
            if (notification.slackbutton) {
                await Slack.deprecateURL(notification.slackbutton);
            }

            const response = await Slack.deliverMessage(notification, heartbeatJSON, message);

            console.log({response: response.data});

            return okMsg;
        } catch (error) {
            this.throwGeneralAxiosError(error);
        }

    }

    /**
     *
     * @param {object} heartbeatJSON
     * @returns {Promise<null|number>}
     */
    static async calculateDuration(heartbeatJSON) {

        console.log(heartbeatJSON);
        const previousDifferentBeat = await R.findOne("heartbeat", " monitor_id = ? AND status = ? ORDER BY time DESC", [
            heartbeatJSON.monitorID,
            flipStatus(heartbeatJSON.status)
        ]);

        let durationInMs = null;

        if (previousDifferentBeat) {
            durationInMs = new Date(heartbeatJSON.time) - new Date(previousDifferentBeat._time);
        }

        return durationInMs;
    }


    static async buildMessage(heartbeatJSON, monitorJSON, notification, msg, title){

        // check if the notification provider is being tested
        if (heartbeatJSON == null) {
            return {
                "text": msg,
                "channel": notification.slackchannel,
                "username": notification.slackusername,
                "icon_emoji": notification.slackiconemo,
            };

        }

        console.log({heartbeatJSON});

        const duration = await Slack.calculateDuration(heartbeatJSON);

        const baseURL = await setting("primaryBaseURL");
        const monitorUrl = baseURL + getMonitorRelativeURL(heartbeatJSON.monitorID);

        const actions = this.buildActions(monitorUrl, monitorJSON);

        return {
            "text": `${title}\n${msg}`,
            "channel": notification.slackchannel,
            "username": notification.slackusername,
            "icon_emoji": notification.slackiconemo,
            "attachments": [
                {
                    "color": (heartbeatJSON["status"] === UP) ? "#2eb886" : "#e01e5a",
                    "blocks": Slack.buildBlocks(actions, heartbeatJSON, title, msg, duration),
                }
            ]
        };

    }



    /**
     * Builds the actions available in the Slack message
     * @param {string} monitorUrl Uptime Kuma base URL
     * @param {object} monitorJSON The monitor config
     * @returns {Array} The relevant action objects
     */
    static buildActions(monitorUrl, monitorJSON) {
        const actions = [];

        if (monitorUrl) {
            actions.push({
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "Visit Uptime Kuma",
                },
                "value": "Uptime-Kuma",
                "url": monitorUrl,
            });

        }

        if (monitorJSON.url) {
            actions.push({
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "Visit site",
                },
                "value": "Site",
                "url": monitorJSON.url,
            });
        }

        return actions;
    }


    /**
     * Builds the different blocks the Slack message consists of.
     * @param {Array} actions The action objects for the message
     * @param {object} heartbeatJSON The heartbeat object
     * @param {string} title The message title
     * @param {string} msg The message body
     * @param {null|number} duration Number of milliseconds since previous state
     * @returns {Array<object>} The rich content blocks for the Slack message
     */
    static buildBlocks(actions, heartbeatJSON, title, msg, duration) {

        //create an array to dynamically add blocks
        const blocks = [];

        // the header block
        blocks.push({
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": title,
            },
        });

        // the body block, containing the details
        blocks.push({
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": "*Message*\n" + msg,
                },
                {
                    "type": "mrkdwn",
                    "text": `*Time (${heartbeatJSON["timezone"]})*\n${heartbeatJSON["localDateTime"]}`,
                },
                {
                    "type": "mrkdwn",
                    "text": `*After*\n${dayjs.duration(duration/1000).humanize()}`,
                }
            ],
        });

        if (actions.length > 0) {
            //the actions block, containing buttons
            blocks.push({
                "type": "actions",
                "elements": actions,
            });
        }

        return blocks;
    }


    static ENDPOINTS = {
        postMessage: 'https://slack.com/api/chat.postMessage',
        getPermalink: 'https://slack.com/api/chat.getPermalink',
        update: 'https://slack.com/api/chat.update',
    }


    // Keeps track of open alerts in order to update them
    static openAlerts = {};

    static async deliverMessage(options, heartbeatJSON, message) {

        let response = null;
        switch(options.mode){
            case 'app':
                const token = options.botToken;

                const monitorId = heartbeatJSON.monitorId;

                const axiosConfig = {
                    headers: {
                        'Authorization': 'Bearer ' +token,
                    }
                };

                const existingAlerts = Slack.getAlerts(monitorId);
                if(existingAlerts.length > 0 && heartbeatJSON.status === UP){
                    console.log(`Updating ${existingAlerts.length} messages`);
                    const responses = await Promise.all(existingAlerts.map(({channel, ts}) => {
                        message.channel = channel;
                        message.ts = ts;
                        return axios.post(Slack.ENDPOINTS.update, message, axiosConfig);
                    }))

                    //get the last response
                    response = responses.pop();
                }else{
                    response = await axios.post(Slack.ENDPOINTS.postMessage, message, axiosConfig);
                }

                if(response.data.ok){

                    if(heartbeatJSON.status === DOWN){
                        await Slack.trackAlert(monitorId, axiosConfig, response.data.channel, response.data.ts);
                    }else if(heartbeatJSON.status === UP){
                        Slack.clearAlerts(monitorId);
                    }


                }

                break;

            case 'webhook':
            default:
                response = axios.post(options.slackwebhookURL, message);


        }

        return response;
    }


    static async trackAlert(monitorId, axiosConfig, channel, ts) {
        Slack.openAlerts[monitorId] = Slack.openAlerts[monitorId] || [];

        Slack.openAlerts[monitorId].push({
            channel,
            ts
        });

        /*
        const getPermalinkUrl = `${Slack.ENDPOINTS.getPermalink}?channel=${encodeURIComponent(channel)}&message_ts=${encodeURIComponent(ts)}`;

        const permalinkResponse = await axios.get(getPermalinkUrl, axiosConfig)
        if(permalinkResponse.data.ok){
            Slack.openAlerts[monitorId].push(permalinkResponse.data.permalink);
        }

        */
    }

    static clearAlerts(monitorId) {
        Slack.openAlerts[monitorId] = [];
    }

    static getAlerts(monitorId) {
        return Slack.openAlerts[monitorId] || [];
    }
}

module.exports = Slack;
