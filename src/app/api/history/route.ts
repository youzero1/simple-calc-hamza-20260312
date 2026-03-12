import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/database';
import { Calculation } from '@/lib/entities/Calculation';

export async function GET() {
  try {
    const ds = await getDataSource();
    const repo = ds.getRepository(Calculation);
    const history = await repo.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });
    return NextResponse.json({ history });
  } catch (error) {
    console.error('GET /api/history error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { expression, result } = body;

    if (!expression || result === undefined) {
      return NextResponse.json({ error: 'Missing expression or result' }, { status: 400 });
    }

    const ds = await getDataSource();
    const repo = ds.getRepository(Calculation);

    const calculation = repo.create({ expression, result: String(result) });
    await repo.save(calculation);

    // Keep only last 10 entries
    const all = await repo.find({ order: { createdAt: 'ASC' } });
    if (all.length > 10) {
      const toDelete = all.slice(0, all.length - 10);
      await repo.remove(toDelete);
    }

    return NextResponse.json({ success: true, calculation });
  } catch (error) {
    console.error('POST /api/history error:', error);
    return NextResponse.json({ error: 'Failed to save calculation' }, { status: 500 });
  }
}
