const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');

const app = express();
app.get('/', (req, res) => res.send('✅ KnightBot is running on Railway!'));
app.listen(3000, () => console.log('🌍 Web server started on port 3000'));

// Store warnings in JSON
const warningsFile = 'warnings.json';
if (!fs.existsSync(warningsFile)) {
    fs.writeFileSync(warningsFile, '{}');
}
let warnings = JSON.parse(fs.readFileSync(warningsFile));

// Initialize client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ["--no-sandbox"] }
});

// QR login
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

// Bot ready
client.on('ready', () => {
    console.log('✅ KnightBot is online with admin powers!');
});

// Message handling
client.on('message', async (message) => {
    const chat = await message.getChat();

    // Ping
    if (message.body.toLowerCase() === '!ping') {
        return message.reply('🏓 Pong!');
    }

    // Help
    if (message.body.toLowerCase() === '!help') {
        return message.reply(
            '🤖 *KnightBot Commands:*\n\n' +
            '!ping - Test bot\n' +
            '!hello - Greet\n' +
            '!joke - Random joke\n' +
            '!tagall - Mention everyone\n' +
            '!warn @user - Give warning (3 = kick)\n' +
            '!warnings - Show warnings'
        );
    }

    // Hello
    if (message.body.toLowerCase() === '!hello') {
        return message.reply('👋 Hello! I am your KnightBot.');
    }

    // Joke
    if (message.body.toLowerCase() === '!joke') {
        return message.reply('😂 Why did the computer go to the doctor? Because it caught a *virus*!');
    }

    // Tag All Members
    if (message.body.toLowerCase() === '!tagall') {
        if (chat.isGroup) {
            let text = '📢 *Tagging All Members:*\n\n';
            let mentions = [];
            for (let participant of chat.participants) {
                const contact = await client.getContactById(participant.id._serialized);
                mentions.push(contact);
                text += `@${participant.id.user} `;
            }
            await chat.sendMessage(text, { mentions });
        } else {
            message.reply('⚠️ This command only works in groups.');
        }
    }

    // Warnings (Admins only)
    if (message.body.startsWith('!warn') && chat.isGroup) {
        const sender = await message.getContact();
        const admins = chat.participants.filter(p => p.isAdmin);
        const isAdmin = admins.some(a => a.id._serialized === sender.id._serialized);

        if (!isAdmin) {
            return message.reply('❌ Only admins can use this command.');
        }

        if (message.mentionedIds.length === 0) {
            return message.reply('⚠️ You must tag a user to warn.');
        }

        const warnedId = message.mentionedIds[0];
        warnings[warnedId] = (warnings[warnedId] || 0) + 1;
        fs.writeFileSync(warningsFile, JSON.stringify(warnings));

        if (warnings[warnedId] >= 3) {
            await chat.removeParticipants([warnedId]);
            message.reply(`🚨 User <@${warnedId.split('@')[0]}> removed after 3 warnings.`);
        } else {
            message.reply(`⚠️ Warning given to <@${warnedId.split('@')[0]}>. Total: ${warnings[warnedId]}/3`);
        }
    }

    if (message.body.toLowerCase() === '!warnings') {
        let reply = '📑 *Current Warnings:*\n';
        for (let user in warnings) {
            reply += `@${user.split('@')[0]} → ${warnings[user]}/3\n`;
        }
        message.reply(reply);
    }
});

// Welcome new members
client.on('group_join', async (notification) => {
    const chat = await notification.getChat();
    const contact = await notification.getContact();
    chat.sendMessage(
        `🎉 Welcome @${contact.id.user} to *${chat.name}*! 🎊\n⚡ Type *!help* to see my commands.`,
        { mentions: [contact] }
    );
});

// Goodbye
client.on('group_leave', async (notification) => {
    const chat = await notification.getChat();
    const contact = await notification.getContact();
    chat.sendMessage(`👋 Goodbye @${contact.id.user}. We'll miss you!`, { mentions: [contact] });
});

client.initialize();
