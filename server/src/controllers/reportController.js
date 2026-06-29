// src/controllers/reportController.js
const Ticket = require('../models/Ticket');

// Query A: Get Tickets grouped by Status
const getTicketsByStatus = async (req, res) => {
  try {
    const statusCounts = await Ticket.aggregate([
      {
        $group: {
          _id: '$status', 
          count: { $sum: 1 } 
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json(statusCounts);
  } catch (error) {
    res.status(500).json({ message: 'Reporting failed', error: error.message });
  }
};

// Query B: Get Average Resolution Time
const getAverageResolutionTime = async (req, res) => {
  try {
    const resolutionMetrics = await Ticket.aggregate([
      {
        $match: { 
          status: { $in: ['Resolved', 'Closed'] } 
        }
      },
      {
        $project: {
          resolutionTimeMs: { 
            $subtract: ['$updatedAt', '$createdAt'] 
          }
        }
      },
      {
        $group: {
          _id: null, 
          avgTimeMs: { $avg: '$resolutionTimeMs' }
        }
      },
      {
        $project: {
          _id: 0,
          averageResolutionHours: { 
            $divide: ['$avgTimeMs', 1000 * 60 * 60] 
          }
        }
      }
    ]);

    const avgHours = resolutionMetrics.length > 0 
        ? Math.round(resolutionMetrics[0].averageResolutionHours * 10) / 10 
        : 0;

    res.status(200).json({ averageHours: avgHours });
  } catch (error) {
    res.status(500).json({ message: 'Reporting failed', error: error.message });
  }
};

module.exports = {
  getTicketsByStatus,
  getAverageResolutionTime
};