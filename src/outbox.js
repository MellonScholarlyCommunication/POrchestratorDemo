import { listInbox, getNotification } from "./inbox.js";

export async function getEvent(eventUrl) {
    return getNotification(eventUrl);
}

export async function listOutbox(outboxUrl) {
    return listInbox(outboxUrl);
} 