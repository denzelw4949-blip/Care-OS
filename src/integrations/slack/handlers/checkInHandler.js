import AuthService from '../../../services/AuthService.js';
import CheckInService from '../../../services/CheckInService.js';
import { getCompleteCheckInBlocks, getCheckInSuccessBlocks } from '../blocks/checkInBlock.js';
import { isDatabaseAvailable } from '../../../database/dbStatus.js';

/**
 * Handle check-in interactions
 */
export const handleCheckInInteraction = async (slackUserId, client, triggerId = null, viewData = null) => {
    try {
        const hasDatabase = isDatabaseAvailable();
        let user = null;
        let useDatabaseMode = hasDatabase;

        // Try to authenticate if database is available
        if (hasDatabase) {
            try {
                const authResult = await AuthService.authenticateUser('slack', slackUserId);
                user = authResult.user;
            } catch (dbError) {
                console.warn('⚠️  Database auth failed, falling back to demo mode:', dbError.message);
                useDatabaseMode = false;
            }
        }

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

            if (useDatabaseMode && user) {
                // Try to save to database
                try {
                    await CheckInService.submitCheckIn(user.id, checkInData);
                    console.log('✅ Check-in saved to database');
                } catch (dbError) {
                    console.warn('⚠️  Database save failed, logging only:', dbError.message);
                    console.log('✏️ Check-in (fallback demo mode):', {
                        user: slackUserId,
                        data: checkInData,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                // Demo mode - log only
                console.log('✏️ Check-in (demo mode):', {
                    user: slackUserId,
                    data: checkInData,
                    timestamp: new Date().toISOString()
                });
            }

            // Send success message to user
            await client.chat.postMessage({
                channel: slackUserId,
                blocks: getCheckInSuccessBlocks(),
            });

            // DEBUG: Log all extracted values
            console.log('🔍 DEBUG - All check-in values:', JSON.stringify(checkInData, null, 2));
            console.log('🔍 DEBUG - Visibility value type:', typeof checkInData.visibility, '| Value:', checkInData.visibility);

            // TEMPORARY: Force public posting to test channel access
            const forcePublic = true; // SET TO TRUE TO TEST

            // If visibility is PUBLIC, share to general/team channel
            if (checkInData.visibility === 'public' || forcePublic) {
                console.log(`✅ ${forcePublic ? 'FORCED' : 'Normal'} public posting - attempting to share to #general...`);
                try {
                    // Get mood emoji
                    const moodEmoji = {
                        'great': '😄',
                        'good': '😊',
                        'okay': '😐',
                        'not_great': '😕',
                        'struggling': '😞',
                        'stressed': '😰',
                        'overwhelmed': '😫'
                    }[checkInData.mood] || '😊';

                    // Get energy indicator
                    const energyBar = '█'.repeat(Math.floor(checkInData.energyLevel / 2)) + '░'.repeat(5 - Math.floor(checkInData.energyLevel / 2));

                    console.log('📝 Attempting to post to channel with data:', {
                        mood: checkInData.mood,
                        moodEmoji,
                        energyLevel: checkInData.energyLevel,
                        energyBar
                    });

                    const result = await client.chat.postMessage({
                        channel: 'general', // Try without # first
                        text: `${moodEmoji} @${slackUserId} just checked in!`, // Fallback text
                        blocks: [
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `${moodEmoji} *<@${slackUserId}>* just checked in!`
                                }
                            },
                            {
                                type: 'section',
                                fields: [
                                    {
                                        type: 'mrkdwn',
                                        text: `*Energy:* ${energyBar} ${checkInData.energyLevel}/10`
                                    },
                                    {
                                        type: 'mrkdwn',
                                        text: `*Mood:* ${moodEmoji} ${checkInData.mood}`
                                    },
                                    {
                                        type: 'mrkdwn',
                                        text: `*Stress:* ${checkInData.stressLevel}/10`
                                    },
                                    {
                                        type: 'mrkdwn',
                                        text: `*Workload:* ${checkInData.workloadLevel}/10`
                                    }
                                ]
                            },
                            ...(checkInData.notes ? [{
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `💭 _"${checkInData.notes}"_`
                                }
                            }] : []),
                            {
                                type: 'context',
                                elements: [
                                    {
                                        type: 'mrkdwn',
                                        text: '✨ Shared publicly with the team'
                                    }
                                ]
                            }
                        ]
                    });

                    console.log('✅✅✅ SUCCESS! Public check-in posted to channel!');
                    console.log('📬 Message posted with ts:', result.ts, 'to channel:', result.channel);
                } catch (channelError) {
                    console.error('❌❌❌ FAILED to post public check-in!');
                    console.error('Error name:', channelError.name);
                    console.error('Error message:', channelError.message);
                    console.error('Error code:', channelError.code);
                    console.error('Error data:', JSON.stringify(channelError.data, null, 2));
                    console.error('Full error object:', channelError);

                    // Try to notify user of the error
                    try {
                        await client.chat.postMessage({
                            channel: slackUserId,
                            text: `⚠️ Your check-in was saved, but we couldn't post it publicly. Error: ${channelError.message}`
                        });
                    } catch (e) {
                        console.error('Could not even notify user of error:', e);
                    }
                }
            } else {
                console.log('🔒 Visibility is NOT public, skipping channel post. Value:', checkInData.visibility);
            }
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
