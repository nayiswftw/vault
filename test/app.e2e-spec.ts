import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { RecordType } from './../src/common/enums/record-type.enum';
import { Role } from './../src/common/enums/role.enum';
import { UsersService } from './../src/users/users.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let analystToken: string;
  let viewerToken: string;
  let createdRecordId: string;
  let createdExpenseRecordId: string;
  let adminEmail: string;
  let analystEmail: string;
  let viewerEmail: string;
  let incomeRecordDate: string;
  let expenseRecordDate: string;
  let dashboardStartDate: string;
  let dashboardEndDate: string;

  const login = async (email: string, password: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      });

    const body = response.body as unknown as { accessToken: string };

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('accessToken');
    return body.accessToken;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Finance Backend API')
      .setDescription(
        'Backend APIs for finance records, auth, users, and dashboard summaries.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Provide a valid access token from /auth/login.',
        },
        'access-token',
      )
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument, {
      jsonDocumentUrl: 'docs/json',
    });

    await app.init();

    const usersService = app.get(UsersService);
    const runId = Date.now().toString();
    const baseTime = Date.now();

    incomeRecordDate = new Date(baseTime + 1_000).toISOString();
    expenseRecordDate = new Date(baseTime + 2_000).toISOString();
    dashboardStartDate = new Date(baseTime).toISOString();
    dashboardEndDate = new Date(baseTime + 5_000).toISOString();

    adminEmail = `admin-${runId}@example.com`;
    analystEmail = `analyst-${runId}@example.com`;
    viewerEmail = `viewer-${runId}@example.com`;

    await usersService.create({
      name: 'System Admin',
      email: adminEmail,
      password: 'Admin123!',
      role: Role.Admin,
      isActive: true,
    });
    await usersService.create({
      name: 'Data Analyst',
      email: analystEmail,
      password: 'Analyst123!',
      role: Role.Analyst,
      isActive: true,
    });
    await usersService.create({
      name: 'Dashboard Viewer',
      email: viewerEmail,
      password: 'Viewer123!',
      role: Role.Viewer,
      isActive: true,
    });

    adminToken = await login(adminEmail, 'Admin123!');
    analystToken = await login(analystEmail, 'Analyst123!');
    viewerToken = await login(viewerEmail, 'Viewer123!');
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({
      status: 'ok',
      service: 'finance-backend-api',
    });
  });

  it('/ready (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/ready');
    const body = response.body as unknown as {
      status: string;
      service: string;
      database: string;
      timestamp: string;
    };

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'finance-backend-api',
        database: 'up',
      }),
    );
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it('/docs (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/docs');

    expect(response.status).toBe(200);
    expect(response.type).toContain('text/html');
  });

  it('/docs/json (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/docs/json');
    const body = response.body as unknown as {
      openapi: string;
      paths: Record<string, unknown>;
    };

    expect(response.status).toBe(200);
    expect(body.openapi).toEqual(expect.any(String));
    expect(body.paths).toHaveProperty('/auth/login');
    expect(body.paths).toHaveProperty('/records');
    expect(body.paths).toHaveProperty('/users/{id}');
    expect(body.paths).toHaveProperty('/audit-logs');
    expect(body.paths).toHaveProperty('/dashboard/summary');
  });

  it('rejects invalid login credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: adminEmail,
        password: 'wrong-password',
      });

    expect(response.status).toBe(401);
  });

  it('rejects unauthenticated access to protected endpoints', async () => {
    const [profileResponse, recordsResponse] = await Promise.all([
      request(app.getHttpServer()).get('/auth/profile'),
      request(app.getHttpServer()).get('/records'),
    ]);

    expect(profileResponse.status).toBe(401);
    expect(recordsResponse.status).toBe(401);
  });

  it('returns authenticated profile payload', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${analystToken}`);

    const body = response.body as unknown as {
      email: string;
      role: string;
      isActive: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.email).toBe(analystEmail);
    expect(body.role).toBe(Role.Analyst);
    expect(body.isActive).toBe(true);
  });

  it('blocks viewer from creating records', async () => {
    const response = await request(app.getHttpServer())
      .post('/records')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        amount: 1500,
        type: RecordType.Income,
        category: 'Salary',
        date: '2026-03-05',
      });

    expect(response.status).toBe(403);
  });

  it('allows admin to create records and blocks invalid data', async () => {
    const invalidResponse = await request(app.getHttpServer())
      .post('/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: -25,
        type: RecordType.Expense,
        category: 'Utilities',
        date: '2026-03-10',
      });

    expect(invalidResponse.status).toBe(400);

    const incomeResponse = await request(app.getHttpServer())
      .post('/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 3200,
        type: RecordType.Income,
        category: 'Salary',
        date: incomeRecordDate,
        notes: 'March payroll',
      });

    const incomeBody = incomeResponse.body as unknown as { id: string };
    expect(incomeResponse.status).toBe(201);
    createdRecordId = incomeBody.id;

    const expenseResponse = await request(app.getHttpServer())
      .post('/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 900,
        type: RecordType.Expense,
        category: 'Rent',
        date: expenseRecordDate,
      });

    const expenseBody = expenseResponse.body as unknown as { id: string };
    expect(expenseResponse.status).toBe(201);
    createdExpenseRecordId = expenseBody.id;
  });

  it('supports cursor pagination metadata in records list', async () => {
    const firstResponse = await request(app.getHttpServer())
      .get('/records?limit=1')
      .set('Authorization', `Bearer ${analystToken}`);

    const firstBody = firstResponse.body as unknown as {
      data: Array<{ id: string }>;
      meta: {
        limit: number;
        nextCursor: string | null;
      };
    };

    expect(firstResponse.status).toBe(200);
    expect(firstBody.meta.limit).toBe(1);
    expect(firstBody.data.length).toBe(1);

    if (firstBody.meta.nextCursor) {
      const secondResponse = await request(app.getHttpServer())
        .get(
          `/records?limit=1&cursor=${encodeURIComponent(firstBody.meta.nextCursor)}`,
        )
        .set('Authorization', `Bearer ${analystToken}`);

      const secondBody = secondResponse.body as unknown as {
        data: Array<{ id: string }>;
        meta: {
          limit: number;
          nextCursor: string | null;
        };
      };

      expect(secondResponse.status).toBe(200);
      expect(secondBody.meta.limit).toBe(1);
      expect(secondBody.data.length).toBeLessThanOrEqual(1);

      if (secondBody.data.length === 1) {
        expect(secondBody.data[0].id).not.toBe(firstBody.data[0].id);
      }
    }
  });

  it('rejects invalid date range filter for records', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/records?startDate=${encodeURIComponent(dashboardEndDate)}&endDate=${encodeURIComponent(dashboardStartDate)}`,
      )
      .set('Authorization', `Bearer ${analystToken}`);

    expect(response.status).toBe(400);
  });

  it('allows analyst to read records but not mutate', async () => {
    const listResponse = await request(app.getHttpServer())
      .get('/records?type=income')
      .set('Authorization', `Bearer ${analystToken}`);

    const listBody = listResponse.body as unknown as {
      data: Array<{ id: string }>;
      meta: {
        limit: number;
        nextCursor: string | null;
      };
    };

    expect(listResponse.status).toBe(200);
    expect(listBody.meta.limit).toBeGreaterThan(0);
    expect(listBody.data.length).toBeGreaterThanOrEqual(1);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ notes: 'should not be accepted' });

    expect(updateResponse.status).toBe(403);
  });

  it('exports records as CSV for analyst', async () => {
    const response = await request(app.getHttpServer())
      .get('/records/export?type=income')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(response.status).toBe(200);
    expect(response.type).toContain('text/csv');
    expect(response.header['content-disposition']).toContain('records-export-');
    expect(response.text).toContain(
      'ID,Amount,Type,Category,Date,Notes,Created By,Created At,Updated At',
    );
  });

  it('allows admin to read audit logs and blocks analyst access', async () => {
    const forbiddenResponse = await request(app.getHttpServer())
      .get('/audit-logs')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(forbiddenResponse.status).toBe(403);

    const response = await request(app.getHttpServer())
      .get(
        `/audit-logs?entityType=FinancialRecord&entityId=${createdRecordId}&action=CREATE&limit=5`,
      )
      .set('Authorization', `Bearer ${adminToken}`);

    const body = response.body as unknown as {
      data: Array<{
        entityId: string;
        entityType: string;
        action: string;
        actor: {
          email: string;
          role: string;
        };
      }>;
      meta: {
        limit: number;
        nextCursor: string | null;
      };
    };

    expect(response.status).toBe(200);
    expect(body.meta.limit).toBe(5);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: createdRecordId,
          entityType: 'FinancialRecord',
          action: 'CREATE',
        }),
      ]),
    );

    const matchingEntry = body.data.find(
      (entry) =>
        entry.entityId === createdRecordId &&
        entry.entityType === 'FinancialRecord' &&
        entry.action === 'CREATE',
    );

    expect(matchingEntry).toBeDefined();
    expect(matchingEntry?.actor.email).toBe(adminEmail);
    expect(matchingEntry?.actor.role).toBe(Role.Admin);
  });

  it('returns dashboard summary for viewer', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/dashboard/summary?months=3&startDate=${encodeURIComponent(dashboardStartDate)}&endDate=${encodeURIComponent(dashboardEndDate)}`,
      )
      .set('Authorization', `Bearer ${viewerToken}`);

    const body = response.body as unknown as {
      totals: {
        income: number;
        expenses: number;
        netBalance: number;
      };
      categoryBreakdown: Array<{
        category: string;
        income?: number;
        expenses?: number;
      }>;
      monthlyTrends: unknown[];
    };

    expect(response.status).toBe(200);
    expect(body.totals).toEqual({
      income: 3200,
      expenses: 900,
      netBalance: 2300,
    });
    expect(body.categoryBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'Salary', income: 3200 }),
        expect.objectContaining({ category: 'Rent', expenses: 900 }),
      ]),
    );
    expect(body.monthlyTrends.length).toBe(3);
  });

  it('rejects invalid date range filter for dashboard summary', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/dashboard/summary?startDate=${encodeURIComponent(dashboardEndDate)}&endDate=${encodeURIComponent(dashboardStartDate)}`,
      )
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(response.status).toBe(400);
  });

  it('rejects duplicate user email creation', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicate Analyst',
        email: analystEmail.toUpperCase(),
        password: 'Duplicate123!',
        role: Role.Analyst,
        isActive: true,
      });

    expect(response.status).toBe(409);
  });

  it('allows admin to manage users and rejects inactive login', async () => {
    const inactiveEmail = `temp-analyst-${Date.now()}@example.com`;
    const createUserResponse = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Temp Analyst',
        email: inactiveEmail,
        password: 'Temp12345!',
        role: Role.Analyst,
        isActive: false,
      });

    expect(createUserResponse.status).toBe(201);

    const createUserBody = createUserResponse.body as unknown as {
      id: string;
      email: string;
      isActive: boolean;
    };

    const getUserResponse = await request(app.getHttpServer())
      .get(`/users/${createUserBody.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const getUserBody = getUserResponse.body as unknown as {
      id: string;
      email: string;
      isActive: boolean;
    };

    expect(getUserResponse.status).toBe(200);
    expect(getUserBody.id).toBe(createUserBody.id);
    expect(getUserBody.email).toBe(inactiveEmail);
    expect(getUserBody.isActive).toBe(false);

    const inactiveLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: inactiveEmail,
        password: 'Temp12345!',
      });

    expect(inactiveLoginResponse.status).toBe(403);
  });

  it('blocks non-admin user-management access', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(response.status).toBe(403);
  });

  it('allows admin to update and delete records', async () => {
    const updateResponse = await request(app.getHttpServer())
      .patch(`/records/${createdExpenseRecordId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Paid via bank transfer' });

    const updatedBody = updateResponse.body as unknown as {
      id: string;
      notes: string | null;
    };

    expect(updateResponse.status).toBe(200);
    expect(updatedBody.id).toBe(createdExpenseRecordId);
    expect(updatedBody.notes).toBe('Paid via bank transfer');

    const transientResponse = await request(app.getHttpServer())
      .post('/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 50,
        type: RecordType.Expense,
        category: 'Transient',
        date: new Date(Date.now() + 3_000).toISOString(),
        notes: 'Created for deletion test',
      });

    const transientBody = transientResponse.body as unknown as { id: string };
    expect(transientResponse.status).toBe(201);

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/records/${transientBody.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({ deletedRecordId: transientBody.id });

    const fetchDeletedResponse = await request(app.getHttpServer())
      .get(`/records/${transientBody.id}`)
      .set('Authorization', `Bearer ${analystToken}`);

    expect(fetchDeletedResponse.status).toBe(404);
  });

  afterAll(async () => {
    await app.close();
  });
});
