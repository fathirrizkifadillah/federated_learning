import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';

const router = Router();

// Endpoint for local agent pairing and client registration
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientUuid = req.body.client_uuid || crypto.randomUUID();
    const pairingToken = crypto.randomBytes(24).toString('hex');
    const pairingTokenHash = crypto.createHash('sha256').update(pairingToken).digest('hex');

    const client = await prisma.clientRegistry.upsert({
      where: { clientUuid },
      update: {
        pairingTokenHash,
        lastActiveAt: new Date(),
      },
      create: {
        clientUuid,
        pairingTokenHash,
      },
    });

    res.status(200).json({
      status: 'REGISTERED',
      client_uuid: client.clientUuid,
      pairing_token: pairingToken,
      registered_at: client.registeredAt.toISOString(),
      message: 'Client paired successfully. Retain pairing_token for local loopback verification.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
