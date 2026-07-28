import { Router } from 'express';
import {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
} from '../controllers/video.controller.js';
import { upload } from '../middlewares/multer.js';
import { verifyJWT, optionalAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.route('/')
    .get(getAllVideos)
    .post(
        verifyJWT,
        upload.fields([
            { name: 'videoFile', maxCount: 1 },
            { name: 'thumbnail', maxCount: 1 }
        ]),
        publishAVideo
    );

router.route('/:videoId')
    .get(optionalAuth, getVideoById)
    .patch(verifyJWT, upload.single('thumbnail'), updateVideo)
    .delete(verifyJWT, deleteVideo);

router.route('/toggle/publish/:videoId').patch(verifyJWT, togglePublishStatus);

export default router;