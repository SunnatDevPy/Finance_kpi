import {
  BanIcon,
  CheckIcon,
  FilterXIcon,
  KeyRoundIcon,
  Loader2Icon,
  LogInIcon,
  LogOutIcon,
  MinusIcon,
  PowerIcon,
  PowerOffIcon,
  SaveIcon,
  Trash2Icon,
  UnlockIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";

export const CancelIcon = () => <XIcon data-icon="inline-start" />;
export const SaveIconBtn = () => <SaveIcon data-icon="inline-start" />;
export const DeleteIconBtn = () => <Trash2Icon data-icon="inline-start" />;
export const RemoveIconBtn = () => <MinusIcon data-icon="inline-start" />;
export const LoginIconBtn = () => <LogInIcon data-icon="inline-start" />;
export const LogoutIconBtn = () => <LogOutIcon data-icon="inline-start" />;
export const LoadingIconBtn = () => <Loader2Icon data-icon="inline-start" className="animate-spin" />;
export const KeyIconBtn = () => <KeyRoundIcon data-icon="inline-start" />;
export const ClearFilterIconBtn = () => <FilterXIcon data-icon="inline-start" />;
export const ActivateIconBtn = () => <PowerIcon data-icon="inline-start" />;
export const DeactivateIconBtn = () => <PowerOffIcon data-icon="inline-start" />;
export const BlockIconBtn = () => <BanIcon data-icon="inline-start" />;
export const UnblockIconBtn = () => <UnlockIcon data-icon="inline-start" />;
export const CreateUserIconBtn = () => <UserPlusIcon data-icon="inline-start" />;
export const ConfirmIconBtn = () => <CheckIcon data-icon="inline-start" />;
