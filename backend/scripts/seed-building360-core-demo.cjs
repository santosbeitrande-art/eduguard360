const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USER || 'ecotrade_app',
    password: process.env.DATABASE_PASSWORD || 'secure_password',
    database: process.env.DATABASE_NAME || 'ecotrade360',
  });

  const tenantId = process.env.BUILDING360_PUBLIC_TENANT_ID || 'tenant-demo-1';
  const schoolId = process.env.BUILDING360_PUBLIC_SCHOOL_ID || 'school-demo-1';

  await client.connect();

  try {
    await client.query('BEGIN');

    const org = await client.query(
      `
      INSERT INTO building360_organizations ("tenantId", "schoolId", name, code, status, "isActive")
      VALUES ($1, $2, $3, $4, 'active', true)
      ON CONFLICT DO NOTHING
      RETURNING id
      `,
      [tenantId, schoolId, 'Building360 Demo', 'ORG-DEMO-001'],
    );

    const orgId = org.rows[0]?.id || (
      await client.query(
        `SELECT id FROM building360_organizations WHERE "tenantId" = $1 AND code = $2 LIMIT 1`,
        [tenantId, 'ORG-DEMO-001'],
      )
    ).rows[0].id;

    const portfolio = await client.query(
      `
      INSERT INTO building360_portfolios ("tenantId", "schoolId", "organizationId", name, code, status, "isActive")
      VALUES ($1, $2, $3, $4, $5, 'active', true)
      ON CONFLICT DO NOTHING
      RETURNING id
      `,
      [tenantId, schoolId, orgId, 'Maputo Properties', 'PORT-MAP-001'],
    );

    const portfolioId = portfolio.rows[0]?.id || (
      await client.query(
        `SELECT id FROM building360_portfolios WHERE "tenantId" = $1 AND code = $2 LIMIT 1`,
        [tenantId, 'PORT-MAP-001'],
      )
    ).rows[0].id;

    const site = await client.query(
      `
      INSERT INTO building360_sites ("tenantId", "schoolId", "organizationId", "portfolioId", name, city, type, status, "isActive")
      VALUES ($1, $2, $3, $4, $5, $6, 'commercial', 'active', true)
      ON CONFLICT DO NOTHING
      RETURNING id
      `,
      [tenantId, schoolId, orgId, portfolioId, 'Maputo Central', 'Maputo'],
    );

    const siteId = site.rows[0]?.id || (
      await client.query(
        `SELECT id FROM building360_sites WHERE "tenantId" = $1 AND name = $2 LIMIT 1`,
        [tenantId, 'Maputo Central'],
      )
    ).rows[0].id;

    const building = await client.query(
      `
      INSERT INTO building360_buildings ("tenantId", "schoolId", "organizationId", "portfolioId", "siteId", name, code, floors, status, "isActive")
      VALUES ($1, $2, $3, $4, $5, $6, $7, 3, 'active', true)
      ON CONFLICT DO NOTHING
      RETURNING id
      `,
      [tenantId, schoolId, orgId, portfolioId, siteId, 'Torre A', 'BLD-TORRE-A'],
    );

    const buildingId = building.rows[0]?.id || (
      await client.query(
        `SELECT id FROM building360_buildings WHERE "tenantId" = $1 AND code = $2 LIMIT 1`,
        [tenantId, 'BLD-TORRE-A'],
      )
    ).rows[0].id;

    const floors = [
      { label: 'Piso 1', level: 1, code: 'FLR-1' },
      { label: 'Piso 2', level: 2, code: 'FLR-2' },
      { label: 'Piso 3', level: 3, code: 'FLR-3' },
    ];

    const floorIds = {};
    for (const floor of floors) {
      await client.query(
        `
        INSERT INTO building360_floors ("tenantId", "schoolId", "buildingId", label, level, status, "isActive")
        VALUES ($1, $2, $3, $4, $5, 'active', true)
        ON CONFLICT DO NOTHING
        `,
        [tenantId, schoolId, buildingId, floor.label, floor.level],
      );

      const floorRow = await client.query(
        `SELECT id FROM building360_floors WHERE "tenantId" = $1 AND "buildingId" = $2 AND level = $3 LIMIT 1`,
        [tenantId, buildingId, floor.level],
      );
      floorIds[floor.level] = floorRow.rows[0].id;
    }

    const units = [
      ['101', 1], ['102', 1], ['103', 1],
      ['201', 2], ['202', 2], ['203', 2],
      ['301', 3], ['302', 3], ['303', 3],
    ];

    for (const [number, level] of units) {
      await client.query(
        `
        INSERT INTO building360_units ("tenantId", "schoolId", "buildingId", "floorId", "siteId", number, code, type, status, "areaM2", "isActive")
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'office', 'occupied', 85, true)
        ON CONFLICT DO NOTHING
        `,
        [tenantId, schoolId, buildingId, floorIds[level], siteId, number, `UNIT-${number}`],
      );
    }

    const assets = [
      ['Gerador Principal', 'AST-GERADOR-01', 'critical', 'warning'],
      ['Elevador Torre A', 'AST-ELEVADOR-01', 'high', 'active'],
      ['CCTV Perimetral', 'AST-CCTV-01', 'medium', 'active'],
    ];

    for (const [name, code, criticality, status] of assets) {
      await client.query(
        `
        INSERT INTO building360_assets ("tenantId", "schoolId", "siteId", "buildingId", code, name, category, status, criticality, "isActive")
        VALUES ($1, $2, $3, $4, $5, $6, 'infrastructure', $7, $8, true)
        ON CONFLICT DO NOTHING
        `,
        [tenantId, schoolId, siteId, buildingId, code, name, status, criticality],
      );
    }

    await client.query('COMMIT');

    const summary = await client.query(
      `
      SELECT
        (SELECT COUNT(*) FROM building360_sites WHERE "tenantId" = $1 AND "isActive" = true) AS sites,
        (SELECT COUNT(*) FROM building360_buildings WHERE "tenantId" = $1 AND "isActive" = true) AS buildings,
        (SELECT COUNT(*) FROM building360_units WHERE "tenantId" = $1 AND "isActive" = true) AS units,
        (SELECT COUNT(*) FROM building360_assets WHERE "tenantId" = $1 AND "isActive" = true) AS assets,
        (SELECT COUNT(*) FROM building360_work_orders WHERE "tenantId" = $1 AND "isActive" = true AND status = 'open') AS open_work_orders
      `,
      [tenantId],
    );

    console.log(JSON.stringify({
      ok: true,
      tenantId,
      schoolId,
      summary: summary.rows[0],
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('seed-building360-core-demo failed:', error);
  process.exit(1);
});
