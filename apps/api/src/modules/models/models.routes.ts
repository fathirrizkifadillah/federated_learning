import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';

const router = Router();

router.get('/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeModel = await prisma.modelVersion.findFirst({
      where: { isActive: true },
      include: {
        trainingRounds: {
          orderBy: { roundNumber: 'desc' },
          take: 5,
        },
      },
    });

    if (!activeModel) {
      return res.status(200).json({
        active: false,
        message: 'No global federated model currently active. Training rounds pending.',
      });
    }

    res.status(200).json({
      active: true,
      version_tag: activeModel.versionTag,
      architecture_name: activeModel.architectureName,
      parameter_count: activeModel.parameterCount,
      storage_path: activeModel.storagePath,
      recent_rounds: activeModel.trainingRounds,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
