import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import contentRouter from "./content";
import adsRouter from "./ads";
import announcementsRouter from "./announcements";
import tmdbRouter from "./tmdb";
import homeRouter from "./home";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(contentRouter);
router.use(adsRouter);
router.use(announcementsRouter);
router.use(tmdbRouter);
router.use(homeRouter);

export default router;
