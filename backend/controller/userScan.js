// controller/scanController.js

const Scan = require("../schema/scanSchema");

const ScanController = {
  async getUserScans(req, res) {
    try {
      const scans = await Scan.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .select("-__v");

      res.json({
        total: scans.length,
        scans,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

module.exports = ScanController;
