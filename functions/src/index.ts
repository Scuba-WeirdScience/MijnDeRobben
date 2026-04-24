// ── Root export — wires all Cloud Functions ─────────────────────────────────
// Initialize Firebase Admin SDK once here via shared/admin.ts side-effect.
import './shared/admin';

// ── Auth ─────────────────────────────────────────────────────────────────────
export {
  onUserCreated,
  validateGeboortedatum,
  getRoles,
} from './auth/auth.functions';

// ── Members ──────────────────────────────────────────────────────────────────
export {
  getMembers,
  getMember,
  getMe,
  createMember,
  updateMember,
  deleteMember,
  getMijnKinderen,
  resendUitnodiging,
  scheduledMembershipExpiry,
} from './members/members.functions';

// ── Roles / Admin ─────────────────────────────────────────────────────────────
export {
  getUsers,
  getUserRoles,
  assignRole,
  removeRole,
  updateUser,
  resetPassword,
  deleteAvatar,
} from './roles/roles.functions';

// ── Leningen ──────────────────────────────────────────────────────────────────
export {
  takeLening,
  returnLening,
  getMyLeningen,
  getMateriaalStatus,
  getAllLeningen,
  getLeningenVoorLid,
} from './leningen/leningen.functions';

// ── Berichten ─────────────────────────────────────────────────────────────────
export {
  getBerichten,
  getBericht,
  createBericht,
  deleteBericht,
  markeerGelezen,
  markeerOngelezen,
  onLezingCreated,
  onLezingDeleted,
  onBerichtCreated,
  getBerichtenVoorLid,
  // New group messaging functions
  createGroep,
  updateGroep,
  deleteGroep,
  sendBericht,
  saveConcept,
  publishConcept,
  deleteConcept,
  addReply,
  pinBericht,
  markRead,
  deleteNieuwBericht,
  markUnread,
  // Thread-based messaging v2
  createThread, sendMessage,
  saveMessageConcept, publishMessageConcept, deleteMessageConcept,
  pinThread, pinMessage, deleteMessage,
  markMessageRead, markMessageUnread,
} from './berichten/berichten.functions';

// ── Brevetten + Types ─────────────────────────────────────────────────────────
export {
  getMyBrevetten,
  getMemberBrevetten,
  createBrevet,
  updateBrevet,
  deleteBrevet,
  getBrevetTypes,
  createBrevetType,
  updateBrevetType,
  deleteBrevetType,
  getSpecialtyTypes,
  createSpecialtyType,
  updateSpecialtyType,
  deleteSpecialtyType,
} from './brevetten/brevetten.functions';

// ── User Settings ─────────────────────────────────────────────────────────────
export {
  getUserSettings,
  saveUserSettings,
} from './user-settings/user-settings.functions';

export {
  getMateriaalTypes,
  getMateriaalTypesWithMaterialen,
  createMateriaalType,
  updateMateriaalType,
  deleteMateriaalType,
  getMaterialenByType,
  createMateriaal,
  updateMateriaal,
  deleteMateriaal,
} from './materialen/materialen.functions';
