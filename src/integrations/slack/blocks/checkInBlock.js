/**
 * Slack Block Kit UI Components for Daily Check-In
 */

/**
 * Welcome message for check-in
 */
export const getCheckInWelcomeBlocks = () => {
    return [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: '👋 Daily CARE Check-In',
                emoji: true,
            },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: 'Take a moment to share how you\'re doing today. Your wellbeing matters! 💙',
            },
        },
        {
            type: 'divider',
        },
    ];
};

/**
 * Energy level question
 */
export const getEnergyLevelBlock = () => {
    return [
        {
            type: 'input',
            block_id: 'energy_level',
            element: {
                type: 'static_select',
                action_id: 'energy_select',
                placeholder: {
                    type: 'plain_text',
                    text: 'Select your energy level',
                },
                options: Array.from({ length: 10 }, (_, i) => ({
                    text: {
                        type: 'plain_text',
                        text: `${i + 1} ${i < 3 ? '😴' : i < 6 ? '😐' : '🚀'}`,
                    },
                    value: String(i + 1),
                })),
            },
            label: {
                type: 'plain_text',
                text: '⚡ Energy Level',
            },
        },
    ];
};

/**
 * Stress level question
 */
export const getStressLevelBlock = () => {
    return [
        {
            type: 'input',
            block_id: 'stress_level',
            element: {
                type: 'static_select',
                action_id: 'stress_select',
                placeholder: {
                    type: 'plain_text',
                    text: 'Select your stress level',
                },
                options: Array.from({ length: 10 }, (_, i) => ({
                    text: {
                        type: 'plain_text',
                        text: `${i + 1} ${i < 3 ? '😊' : i < 6 ? '😐' : '😰'}`,
                    },
                    value: String(i + 1),
                })),
            },
            label: {
                type: 'plain_text',
                text: '😌 Stress Level',
            },
        },
    ];
};

/**
 * Workload level question
 */
export const getWorkloadLevelBlock = () => {
    return [
        {
            type: 'input',
            block_id: 'workload_level',
            element: {
                type: 'static_select',
                action_id: 'workload_select',
                placeholder: {
                    type: 'plain_text',
                    text: 'Select your workload level',
                },
                options: Array.from({ length: 10 }, (_, i) => ({
                    text: {
                        type: 'plain_text',
                        text: `${i + 1} ${i < 3 ? '🏖️' : i < 6 ? '📝' : '🔥'}`,
                    },
                    value: String(i + 1),
                })),
            },
            label: {
                type: 'plain_text',
                text: '📋 Workload Level',
            },
        },
    ];
};

/**
 * Mood question
 */
export const getMoodBlock = () => {
    return [
        {
            type: 'input',
            block_id: 'mood',
            element: {
                type: 'static_select',
                action_id: 'mood_select',
                placeholder: {
                    type: 'plain_text',
                    text: 'Select your mood',
                },
                options: [
                    { text: { type: 'plain_text', text: '😄 Great' }, value: 'great' },
                    { text: { type: 'plain_text', text: '🙂 Good' }, value: 'good' },
                    { text: { type: 'plain_text', text: '😐 Okay' }, value: 'okay' },
                    { text: { type: 'plain_text', text: '😕 Not great' }, value: 'not_great' },
                    { text: { type: 'plain_text', text: '😞 Struggling' }, value: 'struggling' },
                ],
            },
            label: {
                type: 'plain_text',
                text: '😊 Overall Mood',
            },
        },
    ];
};

/**
 * Notes input
 */
export const getNotesBlock = () => {
    return [
        {
            type: 'input',
            block_id: 'notes',
            optional: true,
            element: {
                type: 'plain_text_input',
                action_id: 'notes_input',
                multiline: true,
                placeholder: {
                    type: 'plain_text',
                    text: 'Anything else you\'d like to share? (optional)',
                },
            },
            label: {
                type: 'plain_text',
                text: '💭 Additional Notes',
            },
        },
        {
            type: 'divider',
        },
    ];
};

/**
 * Privacy toggle
 */
export const getPrivacyBlock = () => {
    return [
        {
            type: 'input',
            block_id: 'privacy',
            element: {
                type: 'static_select',
                action_id: 'privacy_select',
                initial_option: {
                    text: { type: 'plain_text', text: '👤 Manager Only' },
                    value: 'manager_only',
                },
                options: [
                    { text: { type: 'plain_text', text: '🔒 Private' }, value: 'private' },
                    { text: { type: 'plain_text', text: '👤 Manager Only' }, value: 'manager_only' },
                    { text: { type: 'plain_text', text: '🌐 Team (Public)' }, value: 'public' },
                ],
            },
            label: {
                type: 'plain_text',
                text: '🔒 Privacy Settings',
            },
        },
    ];
};

/**
 * Complete check-in form
 */
export const getCompleteCheckInBlocks = () => {
    return [
        ...getCheckInWelcomeBlocks(),
        ...getEnergyLevelBlock(),
        ...getStressLevelBlock(),
        ...getWorkloadLevelBlock(),
        ...getMoodBlock(),
        ...getNotesBlock(),
        ...getPrivacyBlock(),
    ];
};

/**
 * Success message after submission
 */
export const getCheckInSuccessBlocks = () => {
    return [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: '✅ Check-In Complete!',
                emoji: true,
            },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: 'Thank you for sharing! Your wellbeing matters, and we\'re here to support you. 💙',
            },
        },
    ];
};

/**
 * Task list view
 */
export const getTaskListBlocks = (tasks) => {
    const blocks = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: '📋 Your Tasks',
                emoji: true,
            },
        },
        {
            type: 'divider',
        },
    ];

    if (tasks.length === 0) {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '✨ No tasks yet. Create one to get started!',
            },
        });
        blocks.push({
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '➕ Create Task',
                        emoji: true,
                    },
                    style: 'primary',
                    action_id: 'create_task',
                },
            ],
        });
    } else {
        tasks.forEach((task) => {
            const priorityEmoji = task.priority >= 4 ? '🔴' : task.priority >= 3 ? '🟡' : '🟢';
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `${priorityEmoji} *${task.title}*\n${task.description || 'No description'}`,
                },
                accessory: {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '✓ Complete',
                    },
                    value: task.id,
                    action_id: `complete_task_${task.id}`,
                },
            });
        });
    }

    return blocks;
};

/**
 * Recognition block
 */
export const getRecognitionBlocks = () => {
    return [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: '🎉 Recognize a Teammate',
                emoji: true,
            },
        },
        {
            type: 'input',
            block_id: 'recognition_user',
            element: {
                type: 'users_select',
                action_id: 'user_select',
                placeholder: {
                    type: 'plain_text',
                    text: 'Select a teammate',
                },
            },
            label: {
                type: 'plain_text',
                text: 'Who would you like to recognize?',
            },
        },
        {
            type: 'input',
            block_id: 'recognition_message',
            element: {
                type: 'plain_text_input',
                action_id: 'message_input',
                multiline: true,
                placeholder: {
                    type: 'plain_text',
                    text: 'Tell them why you appreciate them...',
                },
            },
            label: {
                type: 'plain_text',
                text: 'Message',
            },
        },
        {
            type: 'input',
            block_id: 'recognition_category',
            optional: true,
            element: {
                type: 'static_select',
                action_id: 'category_select',
                placeholder: {
                    type: 'plain_text',
                    text: 'Select a category',
                },
                options: [
                    { text: { type: 'plain_text', text: '🤝 Teamwork' }, value: 'teamwork' },
                    { text: { type: 'plain_text', text: '🎯 Problem Solving' }, value: 'problem_solving' },
                    { text: { type: 'plain_text', text: '💡 Innovation' }, value: 'innovation' },
                    { text: { type: 'plain_text', text: '🌟 Leadership' }, value: 'leadership' },
                    { text: { type: 'plain_text', text: '❤️ Support' }, value: 'support' },
                ],
            },
            label: {
                type: 'plain_text',
                text: 'Category (optional)',
            },
        },
    ];
};
