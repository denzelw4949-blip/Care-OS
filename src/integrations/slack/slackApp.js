import config from '../../config/index.js';

import { handleCheckInInteraction } from './handlers/checkInHandler.js';
import { handleTaskInteraction } from './handlers/taskHandler.js';
import { handleRecognitionSubmit } from './handlers/recognitionHandler.js';
import AuthService from '../../services/AuthService.js';

/**
 * Slack App initialization with Bolt SDK
 */
import pkg from '@slack/bolt';
const { App, ExpressReceiver } = pkg;
/**
 * Slack App initialization with Bolt SDK
 */
class SlackApp {
    constructor() {
        this.receiver = new ExpressReceiver({
            signingSecret: config.slack.signingSecret || 'demo-secret',
            endpoints: ['/events', '/commands', '/interactions'], // Listen on all configured paths
            processBeforeResponse: true
        });

        this.app = new App({
            token: config.slack.botToken || 'xoxb-demo',
            receiver: this.receiver,
        });

        this.setupEventHandlers();
        this.setupCommandHandlers();
        this.setupActionHandlers();
    }

    /**
     * Setup event subscriptions
     */
    setupEventHandlers() {
        // App home opened
        this.app.event('app_home_opened', async ({ event, client }) => {
            try {
                // Authenticate user
                const { user } = await AuthService.authenticateUser('slack', event.user);

                await client.views.publish({
                    user_id: event.user,
                    view: {
                        type: 'home',
                        blocks: [
                            {
                                type: 'header',
                                text: {
                                    type: 'plain_text',
                                    text: '👋 Welcome to CARE OS',
                                },
                            },
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `Hi ${user.display_name || 'there'}! I'm here to support your wellbeing and help you stay organized. 💙`,
                                },
                            },
                            {
                                type: 'divider',
                            },
                            {
                                type: 'actions',
                                elements: [
                                    {
                                        type: 'button',
                                        text: {
                                            type: 'plain_text',
                                            text: '📝 Daily Check-In',
                                        },
                                        action_id: 'start_checkin',
                                        style: 'primary',
                                    },
                                    {
                                        type: 'button',
                                        text: {
                                            type: 'plain_text',
                                            text: '📋 My Tasks',
                                        },
                                        action_id: 'view_tasks',
                                    },
                                    {
                                        type: 'button',
                                        text: {
                                            type: 'plain_text',
                                            text: '🎉 Recognize Someone',
                                        },
                                        action_id: 'give_recognition',
                                    },
                                ],
                            },
                        ],
                    },
                });
            } catch (error) {
                console.error('Error handling app_home_opened:', error);
            }
        });

        // App mention
        this.app.event('app_mention', async ({ event, client }) => {
            try {
                await client.chat.postMessage({
                    channel: event.channel,
                    text: `Hi <@${event.user}>! 👋 Use the slash commands to interact with me:\n` +
                        '• `/checkin` - Start your daily check-in\n' +
                        '• `/tasks` - View your tasks\n' +
                        '• `/recognize` - Recognize a teammate',
                });
            } catch (error) {
                console.error('Error handling app_mention:', error);
            }
        });
    }

    /**
     * Setup slash command handlers
     */
    setupCommandHandlers() {
        // /checkin command
        this.app.command('/checkin', async ({ command, ack, client }) => {
            await ack();

            try {
                const { isDatabaseAvailable } = await import('./../../database/dbStatus.js');

                // Only authenticate if database is available - but don't block modal if it fails
                if (isDatabaseAvailable()) {
                    try {
                        const { user } = await AuthService.authenticateUser('slack', command.user_id);
                    } catch (dbError) {
                        console.warn('⚠️  Auth failed for /checkin, continuing anyway:', dbError.message);
                    }
                }

                const { getCompleteCheckInBlocks } = await import('./blocks/checkInBlock.js');

                await client.views.open({
                    trigger_id: command.trigger_id,
                    view: {
                        type: 'modal',
                        callback_id: 'checkin_modal',
                        title: {
                            type: 'plain_text',
                            text: 'Daily Check-In',
                        },
                        submit: {
                            type: 'plain_text',
                            text: 'Submit',
                        },
                        blocks: getCompleteCheckInBlocks(),
                    },
                });
            } catch (error) {
                console.error('Error opening check-in modal:', error);
            }
        });

        // /tasks command
        this.app.command('/tasks', async ({ command, ack, client }) => {
            await ack();

            try {
                await handleTaskInteraction(command.user_id, client, command.trigger_id);
            } catch (error) {
                console.error('Error displaying tasks:', error);
            }
        });

        // /recognize command
        this.app.command('/recognize', async ({ command, ack, client }) => {
            await ack();

            try {
                const { getRecognitionBlocks } = await import('./blocks/checkInBlock.js');

                await client.views.open({
                    trigger_id: command.trigger_id,
                    view: {
                        type: 'modal',
                        callback_id: 'recognition_modal',
                        title: {
                            type: 'plain_text',
                            text: 'Recognize a Teammate',
                        },
                        submit: {
                            type: 'plain_text',
                            text: 'Send Recognition',
                        },
                        blocks: getRecognitionBlocks(),
                    },
                });
            } catch (error) {
                console.error('Error opening recognition modal:', error);
            }
        });
    }

    /**
     * Setup interactive action handlers
     */
    setupActionHandlers() {
        // Start check-in
        this.app.action('start_checkin', async ({ ack, body, client }) => {
            await ack();
            await handleCheckInInteraction(body.user.id, client, body.trigger_id);
        });

        // View tasks
        this.app.action('view_tasks', async ({ ack, body, client }) => {
            await ack();
            await handleTaskInteraction(body.user.id, client, body.trigger_id);
        });

        // Give recognition
        this.app.action('give_recognition', async ({ ack, body, client }) => {
            await ack();

            const { getRecognitionBlocks } = await import('./blocks/checkInBlock.js');

            await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'recognition_modal',
                    title: {
                        type: 'plain_text',
                        text: 'Recognize a Teammate',
                    },
                    submit: {
                        type: 'plain_text',
                        text: 'Send Recognition',
                    },
                    blocks: getRecognitionBlocks(),
                },
            });
        });

        // Modal submissions
        this.app.view('checkin_modal', async ({ ack, body, view, client }) => {
            await ack();
            await handleCheckInInteraction(body.user.id, client, null, view);
        });

        this.app.view('recognition_modal', async ({ ack, body, view, client }) => {
            await ack();
            await handleRecognitionSubmit(body.user.id, view, client);
        });
    }

    /**
     * Get the Bolt app instance
     */
    getInstance() {
        return this.app;
    }

    /**
     * Start the app (receiver)
     */
    async start(port = 3001) {
        await this.app.start(port);
        console.log(`⚡ Slack app is running on port ${port}`);
    }
}

export default new SlackApp();
