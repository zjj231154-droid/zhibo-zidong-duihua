import type { Actor } from "../types/project";

interface ActorAvatarProps {
  actor: Actor;
}

export function ActorAvatar({ actor }: ActorAvatarProps) {
  const initials = actor.name.trim().slice(0, 2) || "角色";

  if (actor.avatarPath) {
    return <img className="actor-avatar" src={actor.avatarPath} alt={`${actor.name} 头像`} />;
  }

  return (
    <div className="actor-avatar actor-avatar-fallback" aria-label={`${actor.name} 默认头像`}>
      {initials}
    </div>
  );
}
