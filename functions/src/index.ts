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
  getVerzorgers,
  addVerzorger,
  removeVerzorger,
  createVerzorgerUser,
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
  updateMijnAvatarUrl,
} from './roles/roles.functions';

// ── Leningen ──────────────────────────────────────────────────────────────────
export {
  takeLening,
  returnLening,
  getMyLeningen,
  getMateriaalStatus,
  getAllLeningen,
  getLeningenVoorLid,
  getLeningenByMateriaalId,
  getLeningenByMemberId,
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
  pinThread, pinMessage, deleteMessage, deleteThread,
  markMessageRead, markMessageUnread,
  getThreadLezingen,
  // Thread concepten
  saveThreadConcept, publishThreadConcept, deleteThreadConcept,
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

// ── Member Organisaties ───────────────────────────────────────────────────────
export {
  getMyOrganisaties,
  getMemberOrganisaties,
  createMemberOrganisatie,
  updateMemberOrganisatie,
  deleteMemberOrganisatie,
} from './brevetten/member-organisaties.functions';

// ── User Settings ─────────────────────────────────────────────────────────────
export {
  getUserSettings,
  saveUserSettings,
} from './user-settings/user-settings.functions';

// ── Activiteiten ──────────────────────────────────────────────────────────────
export {
  getLocaties,
  createLocatie,
  updateLocatie,
  deleteLocatie,
  getActiviteiten,
  getAllActiviteiten,
  getActiviteit,
  createActiviteit,
  updateActiviteit,
  deleteActiviteit,
  getOccurrenceOverrides,
  getAllOccurrenceOverrides,
  registreerVoorActiviteit,
  annuleerRegistratie,
  updateRegistratieGasten,
  registreerNamensLid,
  annuleerNamensLid,
  getRegistratiesVoorOccurrence,
  getMijnRegistraties,
  updateRegistratieStatus,
  resetInschrijvingen,
  getActiviteitByThreadId,
} from './activiteiten/activiteiten.functions';

export { activiteitenIcs } from './activiteiten/activiteiten-ics.functions';

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

