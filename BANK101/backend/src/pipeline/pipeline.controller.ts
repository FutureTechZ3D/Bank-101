import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getPipelineStats, triggerPipelineRun } from './pipeline.service';

export async function getStatsHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const stats = await getPipelineStats();
    return res.status(200).json({ success: true, stats });
  } catch (err: any) {
    console.error('getStatsHandler error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch pipeline stats', error: err?.message });
  }
}

export async function runPipelineHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { scope } = req.body || {};
    const summary = await triggerPipelineRun(scope);
    return res.status(200).json({
      success: true,
      message: 'Academic data pipeline executed successfully',
      summary,
    });
  } catch (err: any) {
    console.error('runPipelineHandler error:', err);
    return res.status(500).json({ success: false, message: 'Pipeline execution failed', error: err?.message });
  }
}
