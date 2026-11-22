import { Request, Response, NextFunction } from 'express';
import { PostsService } from './posts.service';

export class PostsController {
  static async getFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, limit, cursor, sort } = req.query;
      const result = await PostsService.getFeed({
        category: category as string,
        limit: limit ? parseInt(limit as string, 10) : 20,
        cursor: cursor as string,
        sort: sort as 'latest' | 'trending',
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getPostBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const result = await PostsService.getPostBySlug(slug);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getCandidates(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const result = await PostsService.getCandidates(limit);
      res.status(200).json(result);
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
      res.status(200).json({ query: q, items: result });
    } catch (err) {
      next(err);
    }
  }
}
