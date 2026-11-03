import express from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

export function employeeRouter({ db, upload, saveFile, readFile, removeFile, fail, schemas, audit }) {
  const router = express.Router();
  const photoSelect = { id: true, mime: true };
  const temporaryPassword = () => `Gs-${crypto.randomBytes(24).toString('hex')}!a`;
  const safeEmployee = ({ passwordHash, ...employee }) => employee;

  router.get('/', async (req, res) => {
    const { q, where } = schemas.filters(req.query, 'employees');
    const [rows, total] = await Promise.all([
      db.employee.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          jobTitle: true,
          status: true,
          salary: true,
          allowances: true,
          deductions: true,
          photoId: true,
          createdAt: true,
        },
        take: 20,
        skip: (q.page - 1) * 20,
        orderBy: { createdAt: 'desc' },
      }),
      db.employee.count({ where }),
    ]);
    res.json({ rows, total, page: q.page, pageSize: 20 });
  });

  router.get('/assignable-projects', async (req, res) => {
    const projects = await db.project.findMany({
      where: { archived: false, published: true },
      select: { id: true, title: true, category: true },
      orderBy: { title: 'asc' },
    });
    res.json(projects);
  });

  router.get('/hired-applications', async (req, res) => {
    const applications = await db.jobApplication.findMany({
      where: { status: 'HIRED', employee: null },
      select: {
        id: true,
        reference: true,
        name: true,
        email: true,
        mobile: true,
        qualification: true,
        skills: true,
        experience: true,
        city: true,
        introduction: true,
        linkedin: true,
        github: true,
        portfolio: true,
        photoId: true,
        createdAt: true,
        job: { select: { title: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    res.json(applications);
  });

  router.get('/application/:applicationId', async (req, res) => {
    const applicationId = schemas.id.parse(req.params.applicationId);
    const employee = await db.employee.findUnique({
      where: { applicationId },
      select: { id: true, name: true },
    });
    res.json(employee);
  });

  router.post('/', async (req, res) => {
    const data = schemas.employeeHire.parse(req.body);
    const { applicationId } = data;
    const applicant = await db.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: { select: { title: true } }, employee: { select: { id: true, name: true } } },
    });
    if (!applicant) throw fail(404, 'Application not found.');
    if (applicant.status !== 'HIRED') throw fail(400, 'Only hired applicants can be added as employees.');
    if (applicant.employee) throw fail(409, 'An employee profile already exists for this application.');
    if (await db.employee.findUnique({ where: { email: data.email }, select: { id: true } })) throw fail(409, 'An employee account already uses this company email address.');
    if (await db.adminUser.findUnique({ where: { email: data.email }, select: { id: true } })) throw fail(409, 'This email address is already assigned to an administrator account.');
    const password = temporaryPassword();
    const employee = await db.$transaction(async tx => {
      const created = await tx.employee.create({
        data: {
          applicationId: applicant.id,
          name: applicant.name,
          email: data.email,
          mobile: applicant.mobile,
          qualification: applicant.qualification,
          skills: applicant.skills,
          experience: applicant.experience,
          city: applicant.city,
          introduction: applicant.introduction,
          linkedin: applicant.linkedin,
          github: applicant.github,
          portfolio: applicant.portfolio,
          jobTitle: applicant.job.title,
          photoId: applicant.photoId,
          salary: data.salary,
          allowances: data.allowances,
          deductions: data.deductions,
          passwordHash: await bcrypt.hash(password, 12),
        },
      });
      await audit(tx, req.user, 'CREATE_EMPLOYEE', created.id);
      return created;
    });
    res.status(201).json({ employee: safeEmployee(employee), credentials: { email: employee.email, temporaryPassword: password } });
  });

  router.post('/manual', async (req, res) => {
    const data = schemas.employeeCreate.parse(req.body);
    if (await db.employee.findUnique({ where: { email: data.email }, select: { id: true } })) throw fail(409, 'An employee account already uses this email address.');
    if (await db.adminUser.findUnique({ where: { email: data.email }, select: { id: true } })) throw fail(409, 'This email address is already assigned to an administrator account.');
    const password = temporaryPassword();
    const employee = await db.$transaction(async tx => {
      const created = await tx.employee.create({
        data: { ...data, passwordHash: await bcrypt.hash(password, 12) },
      });
      await audit(tx, req.user, 'CREATE_EMPLOYEE_MANUALLY', created.id);
      return created;
    });
    res.status(201).json({ employee: safeEmployee(employee), credentials: { email: employee.email, temporaryPassword: password } });
  });

  router.post('/:id/credentials/reset', async (req, res) => {
    const id = schemas.id.parse(req.params.id);
    const { email } = schemas.employeeCredentialReset.parse(req.body);
    const current = await db.employee.findUnique({ where: { id }, select: { email: true } });
    if (!current) throw fail(404, 'Employee not found.');
    if (email !== current.email) {
      if (await db.employee.findUnique({ where: { email }, select: { id: true } })) throw fail(409, 'Another employee account already uses this company email address.');
      if (await db.adminUser.findUnique({ where: { email }, select: { id: true } })) throw fail(409, 'This email address is already assigned to an administrator account.');
    }
    const password = temporaryPassword();
    await db.$transaction(async tx => {
      await tx.employee.update({
        where: { id },
        data: { email, passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true, sessionVersion: { increment: 1 } },
      });
      await audit(tx, req.user, 'RESET_EMPLOYEE_PASSWORD', id);
    });
    res.json({ email, temporaryPassword: password });
  });

  router.get('/:id', async (req, res) => {
    const id = schemas.id.parse(req.params.id);
    const employee = await db.employee.findUnique({
      where: { id },
      select: {
        id: true, applicationId: true, name: true, email: true, mobile: true, qualification: true,
        skills: true, experience: true, city: true, introduction: true, linkedin: true, github: true,
        portfolio: true, jobTitle: true, status: true, salary: true, allowances: true, deductions: true,
        photoId: true, createdAt: true, updatedAt: true,
        application: { select: { reference: true, createdAt: true } },
        photo: { select: photoSelect },
        assignments: {
          include: { project: { select: { id: true, title: true, category: true } } },
          orderBy: { assignedAt: 'desc' },
        },
        attendance: { orderBy: { date: 'desc' }, take: 366 },
        reports: { include: { project: { select: { id: true, title: true } } }, orderBy: { date: 'desc' }, take: 90 },
      },
    });
    if (!employee) throw fail(404, 'Employee not found.');
    res.json(employee);
  });

  router.put('/:id', async (req, res) => {
    const id = schemas.id.parse(req.params.id);
    const data = schemas.employee.parse(req.body);
    const employee = await db.$transaction(async tx => {
      const updated = await tx.employee.update({ where: { id }, data });
      await audit(tx, req.user, 'UPDATE_EMPLOYEE', id);
      return updated;
    });
    res.json(employee);
  });

  router.delete('/:id', async (req, res) => {
    const id = schemas.id.parse(req.params.id);
    const employee = await db.employee.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!employee) throw fail(404, 'Employee not found.');
    await db.$transaction(async tx => {
      await tx.employee.delete({ where: { id } });
      await audit(tx, req.user, 'DELETE_EMPLOYEE', id);
    });
    res.json({ message: 'Employee profile and its assignments, attendance, and reports were deleted.' });
  });

  router.post('/:id/photo', upload.single('image'), async (req, res) => {
    const id = schemas.id.parse(req.params.id);
    const file = await saveFile(req.file, 'PHOTO');
    try {
      const employee = await db.$transaction(async tx => {
        const stored = await tx.uploadedFile.create({ data: file });
        const updated = await tx.employee.update({ where: { id }, data: { photoId: stored.id } });
        await audit(tx, req.user, 'UPDATE_EMPLOYEE_PHOTO', id);
        return updated;
      });
      res.json({ photoId: employee.photoId });
    } catch (error) {
      await removeFile(file);
      throw error;
    }
  });

  router.get('/:id/photo', async (req, res) => {
    const id = schemas.id.parse(req.params.id);
    const employee = await db.employee.findUnique({ where: { id }, include: { photo: true } });
    if (!employee?.photo) throw fail(404, 'Employee photo not found.');
    res.setHeader('Content-Type', employee.photo.mime);
    res.setHeader('Content-Disposition', 'inline');
    res.send(await readFile(employee.photo));
  });

  router.patch('/:id/reports/:reportId', async (req, res) => {
    const id = schemas.id.parse(req.params.id);
    const reportId = schemas.id.parse(req.params.reportId);
    const data = schemas.employeeReportReview.parse(req.body);
    const report = await db.$transaction(async tx => {
      const updated = await tx.employeeDailyReport.updateMany({
        where: { id: reportId, employeeId: id },
        data: { ...data, reviewedBy: req.user.id, reviewedAt: new Date() },
      });
      if (!updated.count) throw fail(404, 'Daily report not found for this employee.');
      await audit(tx, req.user, `EMPLOYEE_REPORT_${data.status}`, reportId);
      return tx.employeeDailyReport.findUnique({
        where: { id: reportId },
        include: { project: { select: { id: true, title: true } } },
      });
    });
    res.json(report);
  });

  router.post('/:id/projects', async (req, res) => {
    const id = schemas.id.parse(req.params.id);
    const { projectId } = schemas.idWithProject.parse(req.body);
    const project = await db.project.findFirst({ where: { id: projectId, archived: false } });
    if (!project) throw fail(404, 'Project not found.');
    const assignment = await db.employeeProject.create({ data: { employeeId: id, projectId } });
    await audit(db, req.user, 'ASSIGN_EMPLOYEE_PROJECT', `${id}:${projectId}`);
    res.status(201).json(assignment);
  });

  router.delete('/:id/projects/:projectId', async (req, res) => {
    const id = schemas.id.parse(req.params.id);
    const projectId = schemas.id.parse(req.params.projectId);
    await db.$transaction(async tx => {
      const result = await tx.employeeProject.deleteMany({ where: { employeeId: id, projectId } });
      if (!result.count) throw fail(404, 'Project assignment not found.');
      await audit(tx, req.user, 'REMOVE_EMPLOYEE_PROJECT', `${id}:${projectId}`);
    });
    res.json({ message: 'Project assignment removed.' });
  });

  router.put('/:id/attendance', async (req, res) => {
    const id = schemas.id.parse(req.params.id);
    const data = schemas.employeeAttendance.parse(req.body);
    const date = new Date(`${data.date}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== data.date) {
      throw fail(400, 'Enter a valid attendance date.');
    }
    const attendance = await db.$transaction(async tx => {
      const row = await tx.employeeAttendance.upsert({
        where: { employeeId_date: { employeeId: id, date } },
        create: { employeeId: id, date, status: data.status, notes: data.notes || null, markedBy: req.user.id },
        update: { status: data.status, notes: data.notes || null, markedBy: req.user.id },
      });
      await audit(tx, req.user, 'MARK_EMPLOYEE_ATTENDANCE', `${id}:${data.date}:${data.status}`);
      return row;
    });
    res.json(attendance);
  });

  return router;
}
