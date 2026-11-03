import test from 'node:test';
import assert from 'node:assert/strict';
import {
  employee,
  employeeAttendance,
  employeeCredentialReset,
  employeeCreate,
  employeeHire,
  employeePasswordChange,
  employeeReport,
  employeeReportReview,
  filters,
} from '../src/validation.js';

const validEmployee = {
  name: 'Aarav Kumar',
  email: 'aarav@example.com',
  mobile: '+919876543210',
  qualification: 'BSc',
  skills: 'Project coordination',
  experience: '3 years',
  city: 'Mumbai',
  introduction: 'Experienced team member ready to work with the company.',
  linkedin: null,
  github: null,
  portfolio: null,
  jobTitle: 'Project Coordinator',
  status: 'ACTIVE',
  salary: 45000,
  allowances: 5000,
  deductions: 1200,
};

test('employee profiles accept validated personal details and monthly compensation', () => {
  assert.deepEqual(employee.parse(validEmployee), validEmployee);
  assert.equal(employee.safeParse({ ...validEmployee, salary: -1 }).success, false);
  assert.equal(employee.safeParse({ ...validEmployee, role: 'ADMIN' }).success, false);
});

test('daily attendance accepts only supported statuses and date-shaped values', () => {
  assert.equal(employeeAttendance.safeParse({ date: '2026-10-15', status: 'HALF_DAY' }).success, true);
  assert.equal(employeeAttendance.safeParse({ date: '15-10-2026', status: 'PRESENT' }).success, false);
  assert.equal(employeeAttendance.safeParse({ date: '2026-10-15', status: 'REMOTE' }).success, false);
});

test('employee search is limited to profile search fields', () => {
  const { where } = filters({ search: 'Aarav' }, 'employees');
  assert.deepEqual(where.OR, ['name', 'email', 'jobTitle'].map((field) => ({ [field]: { contains: 'Aarav' } })));
});

test('manual employee creation applies zero compensation defaults and rejects credentials', () => {
  const { salary, allowances, deductions, ...details } = validEmployee;
  const { status, ...createDetails } = details;
  assert.deepEqual(employeeCreate.parse(createDetails), {
    ...createDetails,
    salary: 0,
    allowances: 0,
    deductions: 0,
  });
  assert.equal(employeeCreate.safeParse({ ...createDetails, passwordHash: 'plaintext' }).success, false);
});

test('hired applicants require a company login email and admin-set monthly salary', () => {
  const data = {
    applicationId: 'f3b40e10-cf84-4231-9ac0-a4e19cab7928',
    email: 'aarav@gulsaga.com',
    salary: 45000,
  };
  assert.deepEqual(employeeHire.parse(data), { ...data, allowances: 0, deductions: 0 });
  assert.equal(employeeHire.safeParse({ ...data, email: 'aarav@example.com', personalEmail: 'aarav@example.com' }).success, false);
  assert.equal(employeeHire.safeParse({ applicationId: data.applicationId, email: data.email }).success, false);
  assert.deepEqual(employeeCredentialReset.parse({ email: data.email }), { email: data.email });
});

test('employee password changes require strong passwords and only accept a current password when supplied', () => {
  assert.equal(employeePasswordChange.safeParse({ password: 'StrongPassword9!' }).success, true);
  assert.equal(employeePasswordChange.safeParse({ currentPassword: 'old', password: 'weak' }).success, false);
  assert.equal(employeePasswordChange.safeParse({ password: 'StrongPassword9!', unexpected: true }).success, false);
});

test('daily reports and review feedback enforce strict fields and supported states', () => {
  const report = {
    date: '2026-10-15',
    title: 'Completed dashboard work',
    summary: 'Updated employee reporting dashboard and tested the form.',
    completed: 'Implemented the report form and verified request validation.',
    hours: 8,
  };
  assert.equal(employeeReport.safeParse(report).success, true);
  assert.equal(employeeReport.safeParse({ ...report, hours: 25 }).success, false);
  assert.equal(employeeReportReview.safeParse({ status: 'NEEDS_UPDATE', adminFeedback: 'Please add project details.' }).success, true);
  assert.equal(employeeReportReview.safeParse({ status: 'PENDING', adminFeedback: 'Please revise this.' }).success, false);
});
