import AuthService from '../../../services/AuthService.js';
import CheckInService from '../../../services/CheckInService.js';
import { getCompleteCheckInBlocks, getCheckInSuccessBlocks } from '../blocks/checkInBlock.js';

/**
 * Handle check-in interactions
 */
export const handleCheckInInteraction = async (slackUserId, client, triggerId = null, viewData = null) => {
    try {
        // Authenticate user
        const { user, token } = await AuthService.authenticateUser('slack', slackUserId);

        if (viewData) {
            // Modal was submitted - process the check-in
            const values = viewData.state.values;

            const checkInData = {
                energyLevel: parseInt(values.energy_level?.energy_select?.selected_option?.value || '5', 10),
                stressLevel: parseInt(values.stress_level?.stress_select?.selected_option?.value || '5', 10),
                workloadLevel: parseInt(values.workload_level?.workload_select?.selected_option?.value || '5', 10),
                mood: values.mood?.mood_select?.selected_option?.value || 'okay',
                notes: values.notes?.notes_input?.value || null,
                visibility: values.privacy?.privacy_select?.selected_option?.value || 'manager_only',
            };

            await CheckInService.submitCheckIn(user.id, checkInData);

            // Send success message to user
            await client.chat.postMessage({
                channel: slackUserId,
                blocks: getCheckInSuccessBlocks(),
            });
        } else if (triggerId) {
            // Open check-in modal
            await client.views.open({
                trigger_id: triggerId,
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
        }
    } catch (error) {
        console.error('Error in check-in interaction:', error);

        if (client && slackUserId) {
            await client.chat.postMessage({
                channel: slackUserId,
                text: '❌ Sorry, there was an error processing your check-in. Please try again.',
            });
        }
    }
};

export default handleCheckInInteraction;
