import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json(
      categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        post_count: c._count.posts,
      }))
    );
  } catch (err) {
    next(err);
  }
});

export default router;
