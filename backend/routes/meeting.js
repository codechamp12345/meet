const express = require('express');
const { nanoid } = require('nanoid');
const Meeting = require('../models/Meeting');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// @route   POST /meeting/create
// @desc    Create a new meeting
// @access  Private
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const { title } = req.body;

        // Generate unique meeting ID
        const meetingId = nanoid(10);

        // Create new meeting
        const meeting = new Meeting({
            meetingId,
            host: req.user.userId,
            title: title || 'Untitled Meeting'
        });

        await meeting.save();

        res.status(201).json({
            success: true,
            meetingId,
            message: 'Meeting created successfully'
        });

    } catch (error) {
        console.error('Create meeting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating meeting'
        });
    }
});

// @route   GET /meeting/:id
// @desc    Validate and get meeting details
// @access  Public (anyone with link can join)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Find meeting by meetingId
        const meeting = await Meeting.findOne({ meetingId: id })
            .populate('host', 'name email');

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }

        res.json({
            success: true,
            meeting: {
                meetingId: meeting.meetingId,
                title: meeting.title,
                host: meeting.host,
                isActive: meeting.isActive,
                createdAt: meeting.createdAt
            }
        });

    } catch (error) {
        console.error('Get meeting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching meeting'
        });
    }
});

// @route   GET /meeting/user/list
// @desc    Get all meetings created by user
// @access  Private
router.get('/user/list', authMiddleware, async (req, res) => {
    try {
        const meetings = await Meeting.find({ host: req.user.userId })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            meetings: meetings.map(m => ({
                meetingId: m.meetingId,
                title: m.title,
                isActive: m.isActive,
                createdAt: m.createdAt
            }))
        });

    } catch (error) {
        console.error('List meetings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching meetings'
        });
    }
});

// @route   DELETE /meeting/:id
// @desc    End/Delete a meeting
// @access  Private (host only)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const meeting = await Meeting.findOne({ meetingId: id });

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }

        // Check if user is the host
        if (meeting.host.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Only the host can end this meeting'
            });
        }

        // Mark as inactive instead of deleting
        meeting.isActive = false;
        await meeting.save();

        res.json({
            success: true,
            message: 'Meeting ended successfully'
        });

    } catch (error) {
        console.error('Delete meeting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while ending meeting'
        });
    }
});

module.exports = router;
