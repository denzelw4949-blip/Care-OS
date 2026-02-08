import CheckIn from '../models/CheckIn.js';
import StateService from './StateService.js';
import User from '../models/User.js';

/**
 * Check-In Service
 * Handles daily human-state check-ins with privacy controls
 */
export class CheckInService {
    /**
     * Submit a check-in
     */
    static async submitCheckIn(userId, checkInData) {
        // Validate user exists
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Get user's privacy settings
        const privacySettings = await User.getPrivacySettings(userId);

        // Use user's default visibility if not specified
        const visibility = checkInData.visibility || privacySettings?.checkin_visibility || 'manager_only';

        const checkIn = await CheckIn.create({
            userId,
            energyLevel: checkInData.energyLevel,
            stressLevel: checkInData.stressLevel,
            workloadLevel: checkInData.workloadLevel,
            mood: checkInData.mood,
            notes: checkInData.notes,
            visibility,
        });

        // Trigger deviation detection after check-in
        await this.checkForDeviations(userId);

        return checkIn;
    }

    /**
     * Get check-ins for a user (privacy-aware)
     */
    static async getUserCheckIns(userId, requesterId, requesterRole, limit = 30) {
        return await CheckIn.getByUserId(userId, requesterId, requesterRole, limit);
    }

    /**
     * Get team check-ins for a manager
     */
    static async getTeamCheckIns(managerId, date = null) {
        // Verify user is a manager
        const manager = await User.findById(managerId);
        if (!manager || !['manager', 'executive'].includes(manager.role)) {
            throw new Error('User is not a manager');
        }

        return await CheckIn.getTeamCheckIns(managerId, date);
    }

    /**
     * Update check-in privacy
     */
    static async updateCheckInPrivacy(checkInId, userId, visibility) {
        return await CheckIn.updatePrivacy(checkInId, userId, visibility);
    }

    /**
     * Check for deviations in user's check-in pattern
     */
    static async checkForDeviations(userId) {
        const recentCheckIns = await CheckIn.getRecentForAnalysis(userId, 7);

        if (recentCheckIns.length < 3) {
            // Not enough data for deviation detection
            return null;
        }

        // Calculate averages
        const avg = {
            energy: recentCheckIns.reduce((sum, c) => sum + c.energy_level, 0) / recentCheckIns.length,
            stress: recentCheckIns.reduce((sum, c) => sum + c.stress_level, 0) / recentCheckIns.length,
            workload: recentCheckIns.reduce((sum, c) => sum + c.workload_level, 0) / recentCheckIns.length,
        };

        const latest = recentCheckIns[recentCheckIns.length - 1];

        // Check for significant deviations (>25% change)
        const threshold = 0.25;
        const deviations = [];

        if (Math.abs(latest.energy_level - avg.energy) / avg.energy > threshold) {
            deviations.push({
                metric: 'energy',
                previous: avg.energy.toFixed(1),
                current: latest.energy_level,
            });
        }

        if (Math.abs(latest.stress_level - avg.stress) / avg.stress > threshold) {
            deviations.push({
                metric: 'stress',
                previous: avg.stress.toFixed(1),
                current: latest.stress_level,
            });
        }

        if (Math.abs(latest.workload_level - avg.workload) / avg.workload > threshold) {
            deviations.push({
                metric: 'workload',
                previous: avg.workload.toFixed(1),
                current: latest.workload_level,
            });
        }

        if (deviations.length > 0) {
            // Import here to avoid circular dependency
            const { DeviationDetectionService } = await import('./DeviationDetectionService.js');
            await DeviationDetectionService.createDeviation Alert(userId, deviations);
        }

        return deviations;
    }

    /**
     * Get check-in statistics
     */
    static async getStatistics(userId, days = 30) {
        return await CheckIn.getStatistics(userId, days);
    }

    /**
     * Start check-in flow (for chatbot interactions)
     */
    static async startCheckInFlow(userId, platform, conversationId) {
        const state = {
            flowType: 'daily_checkin',
            currentStep: 'energy',
            data: {},
        };

        await StateService.saveState(userId, platform, conversationId, state);
        return state;
    }

    /**
     * Process check-in flow step
     */
    static async processCheckInStep(userId, platform, conversationId, stepData) {
        const state = await StateService.getState(userId, platform, conversationId);

        if (!state || state.flowType !== 'daily_checkin') {
            throw new Error('No active check-in flow');
        }

        // Update state with current step data
        state.data[state.currentStep] = stepData;

        // Determine next step
        const steps = ['energy', 'stress', 'workload', 'mood', 'notes', 'privacy'];
        const currentIndex = steps.indexOf(state.currentStep);

        if (currentIndex < steps.length - 1) {
            state.currentStep = steps[currentIndex + 1];
            await StateService.updateState(userId, platform, conversationId, state);
            return { completed: false, nextStep: state.currentStep, state };
        }

        // Flow complete - submit check-in
        const checkIn = await this.submitCheckIn(userId, {
            energyLevel: parseInt(state.data.energy, 10),
            stressLevel: parseInt(state.data.stress, 10),
            workloadLevel: parseInt(state.data.workload, 10),
            mood: state.data.mood,
            notes: state.data.notes,
            visibility: state.data.privacy || 'manager_only',
        });

        // Clean up state
        await StateService.deleteState(userId, platform, conversationId);

        return { completed: true, checkIn };
    }
}

export default CheckInService;
