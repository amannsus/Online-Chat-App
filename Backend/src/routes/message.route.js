import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  getMessages, 
  getUsersForSidebar, 
  sendMessage, 
  clearIndividualChat, 
  clearGroupChat, 
  getMessageRetentionInfo 
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);

router.delete("/clear/:id", protectRoute, clearIndividualChat);
router.delete("/group/:groupId/clear", protectRoute, clearGroupChat);

router.get("/retention", protectRoute, getMessageRetentionInfo);
router.get("/retention/group/:groupId", protectRoute, getMessageRetentionInfo);

export default router;