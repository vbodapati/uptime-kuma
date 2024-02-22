const NotificationProvider = require("./notification-provider");
const axios = require("axios");
const { DOWN, UP } = require("../../src/util");

class WeCom extends NotificationProvider {
    name = "WeCom";

    /**
     * @inheritdoc
     */
    async send(notification, msg, monitorJSON = null, heartbeatJSON = null) {
        let okMsg = "Sent Successfully.";

        try {
            let WeComUrl =
                "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=" +
                notification.weComBotKey;
            let config = {
                headers: {
                    "Content-Type": "application/json",
                },
            };
            let body = this.composeMessage(heartbeatJSON, monitorJSON, msg);
            await axios.post(WeComUrl, body, config);
            return okMsg;
        } catch (error) {
            this.throwGeneralAxiosError(error);
        }
    }

    /**
     * Generate the message to send
     * @param {object} heartbeatJSON Heartbeat details (For Up/Down only)
     * @param {object} monitorJSON Monitor details
     * @param {string} msg General message
     * @returns {object} Message
     */
    composeMessage(heartbeatJSON, monitorJSON, msg) {
        let params = {};
        if (heartbeatJSON != null) {
            params = {
                msgtype: "markdown",
                markdown: {
                    content: `## [${this.statusToString(
                        heartbeatJSON["status"]
                    )}] ${monitorJSON["name"]} \n> ${
                        heartbeatJSON["msg"]
                    } \n> Time (${heartbeatJSON["timezone"]}): ${
                        heartbeatJSON["localDateTime"]
                    }`,
                },
            };
        } else {
            params = {
                msgtype: "text",
                text: {
                    content: msg,
                },
            };
        }
        return params;
    }

    /**
     * Convert status constant to string
     * @param {const} status The status constant
     * @returns {string} Status
     */
    statusToString(status) {
        switch (status) {
            case DOWN:
                return "DOWN";
            case UP:
                return "UP";
            default:
                return status;
        }
    }
}

module.exports = WeCom;
