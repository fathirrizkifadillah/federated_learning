import { Router } from 'express';
import { PostsController } from './posts.controller';

const router = Router();

router.get('/', PostsController.getFeed);
router.get('/feed', PostsController.getFeed);
router.get('/candidates', PostsController.getCandidates);
router.get('/search', PostsController.search);
router.get('/:slug', PostsController.getPostBySlug);

export default router;
