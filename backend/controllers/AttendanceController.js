import { Attendance } from '../models/index.js';

export class AttendanceController {
  static async list(req, res) {
    try {
      const items = await Attendance.findAll({ where: { tenantId: req.user.tenantId } });
      return res.status(200).json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async create(req, res) {
    try {
      const { employeeId, date, clockIn, clockOut, source, expectedStart, overtimeMinutes } = req.body;

      // Calcul automatique des minutes de retard
      let lateMinutes = 0;
      if (clockIn && date) {
        const startTime = expectedStart || '08:00'; // Heure de début par défaut
        const clockInTs = new Date(`${date}T${clockIn}`);
        const expectedTs = new Date(`${date}T${startTime}`);
        lateMinutes = Math.max(0, Math.floor((clockInTs - expectedTs) / 60000));
      }

      const payload = {
        ...req.body,
        tenantId: req.user.tenantId,
        meta: {
          ...(req.body.meta || {}),
          lateMinutes,
          expectedStart: expectedStart || '08:00'
        }
      };

      const item = await Attendance.create(payload);
      return res.status(201).json(item);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const item = await Attendance.findOne({ where: { id, tenantId: req.user.tenantId } });
      if (!item) return res.status(404).json({ error: 'NotFound' });

      // Recalculer les minutes de retard si clockIn ou date change
      const date      = req.body.date      || item.date;
      const clockIn   = req.body.clockIn   || item.clockIn;
      const existingMeta    = item.meta    || {};
      const expectedStart   = req.body.expectedStart || existingMeta.expectedStart || '08:00';

      let lateMinutes = existingMeta.lateMinutes || 0;
      if (clockIn && date) {
        const clockInTs  = new Date(`${date}T${clockIn}`);
        const expectedTs = new Date(`${date}T${expectedStart}`);
        lateMinutes = Math.max(0, Math.floor((clockInTs - expectedTs) / 60000));
      }

      await item.update({
        ...req.body,
        meta: {
          ...existingMeta,
          ...(req.body.meta || {}),
          lateMinutes,
          expectedStart
        }
      });

      return res.status(200).json(item);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}
