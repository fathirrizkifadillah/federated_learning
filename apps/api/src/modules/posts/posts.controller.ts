import { Request, Response, NextFunction } from 'express';
import { PostsService } from './posts.service';

export class PostsController {
  static async getFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, limit, page, cursor, sort, language } = req.query;
      const parsedPage = page ? parseInt(page as string, 10) : 1;
      const parsedLimit = limit ? parseInt(limit as string, 10) : 24;

      const result = await PostsService.getFeed({
        category: category as string,
        limit: parsedLimit,
        page: parsedPage,
        cursor: cursor as string,
        sort: sort as 'latest' | 'trending',
        language: language as string,
      });

      res.status(200).json({
        success: true,
        data: {
          posts: result.items,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total: result.total,
            totalPages: Math.ceil(result.total / parsedLimit),
          },
          nextCursor: result.nextCursor,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPostBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const result = await PostsService.getPostBySlug(slug);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCandidates(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const language = req.query.language as string;
      const result = await PostsService.getCandidates(limit, language);
      res.status(200).json({
        success: true,
        data: {
          candidates: result,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, limit } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'QUERY_REQUIRED', message: 'Search parameter q is required.' });
      }
      const result = await PostsService.search(q, limit ? parseInt(limit as string, 10) : 20);
      res.status(200).json({
        success: true,
        data: {
          query: q,
          items: result,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
