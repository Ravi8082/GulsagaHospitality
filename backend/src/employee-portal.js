import express from 'express';
import bcrypt from 'bcryptjs';

export function employeePortalRouter({ db, fail, schemas, audit, upload, saveFile, readFile, removeFile }) {
  const router = express.Router();

  router.use(async (req, res, next) => {
    try {
      const employee = req.session.employeeId
        ? await db.employee.findUnique({ where: { id: req.session.employeeId } })
        : null;
      if (!employee || employee.status !== 'ACTIVE' || employee.sessionVersion !== req.session.version) {
        throw fail(401, 'Please sign in with your employee account.');
      }
      req.employee = employee;
      next();
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', (req, res) => res.json({
    id: req.employee.id,
    name: req.employee.name,
    email: req.employee.email,
    jobTitle: req.employee.jobTitle,
    mustChangePassword: req.employee.mustChangePassword,
  }));

  router.post('/change-password', async (req, res) => {
    const data = schemas.employeePasswordChange.parse(req.body);
    if (!req.employee.mustChangePassword && (!data.currentPassword || !await bcrypt.compare(data.currentPassword, req.employee.passwordHash))) {
      throw fail(400, 'Enter your current password.');
    }
    const passwordHash = await bcrypt.hash(data.password, 12);
    const employee = await db.$transaction(async tx => {
      const updated = await tx.employee.update({
        where: { id: req.employee.id },
        data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } },
      });
      await audit(tx, { id: req.employee.id }, 'EMPLOYEE_CHANGE_PASSWORD', req.employee.id);
      return updated;
    });
    req.session.version = employee.sessionVersion;
    res.json({ message: 'Password updated.', mustChangePassword: false });
  });

  router.get('/dashboard', async (req, res) => {
    if (req.employee.mustChangePassword) throw fail(403, 'Change your temporary password to continue.');
    const [employee, reports] = await Promise.all([
      db.employee.findUnique({
        where: { id: req.employee.id },
        select: {
          id: true, name: true, email: true, mobile: true, qualification: true, skills: true,
          experience: true, city: true, introduction: true, linkedin: true, github: true,
          portfolio: true, jobTitle: true, salary: true, allowances: true, deductions: true,
          photoId: true,
          assignments: {
            include: { project: { select: { id: true, title: true, category: true, description: true, status: true, url: true } } },
            orderBy: { assignedAt: 'desc' },
          },
          attendance: { orderBy: { date: 'desc' }, take: 90 },
        },
      }),
      db.employeeDailyReport.findMany({
        where: { employeeId: req.employee.id },
        include: { project: { select: { id: true, title: true } } },
        orderBy: { date: 'desc' },
        take: 90,
      }),
    ]);
    res.json({ employee, reports });
  });

  router.get('/photo', async (req, res) => {
    if (!req.employee.photoId) throw fail(404, 'Employee photo not found.');
    const photo = await db.uploadedFile.findFirst({ where: { id: req.employee.photoId, purpose: 'PHOTO' } });
    if (!photo) throw fail(404, 'Employee photo not found.');
    res.setHeader('Content-Type', photo.mime);
    res.setHeader('Content-Disposition', 'inline');
    res.send(await readFile(photo));
  });

  router.put('/profile', async (req, res) => {
    if (req.employee.mustChangePassword) throw fail(403, 'Change your temporary password to continue.');
    const data = schemas.employeeSelf.parse(req.body);
    const employee = await db.$transaction(async tx => {
      const updated = await tx.employee.update({
        where: { id: req.employee.id },
        data: { mobile: data.mobile, city: data.city, linkedin: data.linkedin, github: data.github, portfolio: data.portfolio },
      });
      await audit(tx, { id: req.employee.id }, 'EMPLOYEE_UPDATE_PROFILE', req.employee.id);
      return updated;
    });
    res.json({ mobile: employee.mobile, city: employee.city, linkedin: employee.linkedin, github: employee.github, portfolio: employee.portfolio });
  });

  router.post('/photo', upload.single('image'), async (req, res) => {
    if (req.employee.mustChangePassword) throw fail(403, 'Change your temporary password to continue.');
    const file = await saveFile(req.file, 'PHOTO');
    try {
      const employee = await db.$transaction(async tx => {
        const stored = await tx.uploadedFile.create({ data: file });
        const updated = await tx.employee.update({ where: { id: req.employee.id }, data: { photoId: stored.id } });
        await audit(tx, { id: req.employee.id }, 'EMPLOYEE_UPDATE_PHOTO', req.employee.id);
        return updated;
      });
      res.json({ photoId: employee.photoId });
    } catch (error) {
      await removeFile(file);
      throw error;
    }
  });

  router.post('/reports', async (req, res) => {
    if (req.employee.mustChangePassword) throw fail(403, 'Change your temporary password to continue.');
    const data = schemas.employeeReport.parse(req.body);
    const date = new Date(`${data.date}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== data.date || date > new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)) {
      throw fail(400, 'Choose a valid date that is not in the future.');
    }
    if (data.projectId) {
      const assignment = await db.employeeProject.findUnique({
        where: { employeeId_projectId: { employeeId: req.employee.id, projectId: data.projectId } },
      });
      if (!assignment) throw fail(403, 'Daily reports can only be linked to your assigned projects.');
    }
    const existing = await db.employeeDailyReport.findUnique({
      where: { employeeId_date: { employeeId: req.employee.id, date } },
      select: { id: true, status: true },
    });
    if (existing?.status === 'REVIEWED') throw fail(409, 'This report has already been reviewed and can no longer be changed.');
    const report = await db.$transaction(async tx => {
      const saved = await tx.employeeDailyReport.upsert({
        where: { employeeId_date: { employeeId: req.employee.id, date } },
        create: { ...data, date, projectId: data.projectId || null, employeeId: req.employee.id, status: 'SUBMITTED' },
        update: { ...data, date, projectId: data.projectId || null, status: 'SUBMITTED', adminFeedback: null, reviewedBy: null, reviewedAt: null },
      });
      await audit(tx, { id: req.employee.id }, 'EMPLOYEE_SUBMIT_DAILY_REPORT', saved.id);
      return saved;
    });
    res.status(201).json(report);
  });

  return router;
}
