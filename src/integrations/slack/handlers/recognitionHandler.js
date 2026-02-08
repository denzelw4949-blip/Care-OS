import AuthService from '../../../services/AuthService.js';
import RecognitionService from '../../../services/RecognitionService.js';

/**
 * Handle recognition submission
 */
export const handleRecognitionSubmit = async (slackUserId, viewData, client) => {
    try {
        // Authenticate user
        const { user } = await AuthService.authenticateUser('slack', slackUserId);

        const values = viewData.state.values;

        const toSlackUserId = values.recognition_user?.user_select?.selected_user;
        const message = values.recognition_message?.message_input?.value;
        const category = values.recognition_category?.category_select?.selected_option?.value;

        if (!toSlackUserId || !message) {
            throw new Error('Missing required fields');
        }

        // Get recipient user
        const { user: recipient } = await AuthService.authenticateUser('slack', toSlackUserId);

        // Create recognition
        await RecognitionService.createRecognition(user.id, recipient.id, message, category);

        // Send confirmation to sender
        await client.chat.postMessage({
            channel: slackUserId,
            text: `✅ Your recognition has been sent to <@${toSlackUserId}>! 🎉`,
        });

        // Notify recipient
        await client.chat.postMessage({
            channel: toSlackUserId,
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '🎉 You\'ve been recognized!',
                        emoji: true,
                    },
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*<@${slackUserId}>* recognized you${category ? ` for *${category}*` : ''}:\n\n> ${message}`,
                    },
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: '💙 Recognition is powerful. Thank you for all you do!',
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error('Error submitting recognition:', error);

        await client.chat.postMessage({
            channel: slackUserId,
            text: '❌ Sorry, there was an error sending your recognition. Please try again.',
        });
    }
};

export default handleRecognitionSubmit;
