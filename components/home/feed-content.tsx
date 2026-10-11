"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon } from "@/components/shared/icons";
import { PostList } from "@/components/home/post-card";
import NewPostModal, {
  type NewPostFormValues,
} from "@/components/home/new-post-modal";
import { posts, type Post } from "@/data/mock/posts";
import { kids } from "@/data/mock/kids";

export interface FeedProfile {
  name: string;
  initial: string;
}

interface FeedContentProps {
  openCreate?: boolean;
  profile: FeedProfile;
}

export default function FeedContent({
  openCreate = false,
  profile,
}: FeedContentProps) {
  const router = useRouter();
  const [postList, setPostList] = useState<Post[]>(posts);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!openCreate) return;
    const timer = setTimeout(() => {
      setOpen(true);
      router.replace("/");
    }, 0);
    return () => clearTimeout(timer);
  }, [openCreate, router]);

  function handleSave(form: NewPostFormValues) {
    const selectedKids = kids.filter((item) =>
      form.kidIds.includes(item.id),
    );
    const audience =
      selectedKids.length === kids.length
        ? "Para: toda la sala"
        : `Para: familia de ${selectedKids
            .map((item) => item.name.split(" ")[0])
            .join(", ")}`;
    const newPost: Post = {
      id: String(
        Math.max(...postList.map((post) => Number(post.id)), 0) + 1,
      ),
      kind: form.kind,
      author: profile.name.split(" ")[0],
      authorInitial: profile.initial,
      time: "Ahora",
      audience,
      body: form.body,
      photos: form.photos.length > 0 ? form.photos : undefined,
      likes: 0,
      comments: 0,
      isMine: true,
    };
    setPostList((prev) => [newPost, ...prev]);
    setOpen(false);
  }

  const firstName = profile.name.split(" ")[0];

  return (
    <>
      <div className="mx-auto w-full max-w-[760px] px-5 pb-20 pt-8 lg:px-10 lg:pt-[34px]">
        <div className="mb-6">
          <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-accent-strong">
            GUARDERÍA · SALA SOLES
          </div>
          <h1 className="m-0 font-heading text-[30px] font-semibold text-ink">
            Buenas, {firstName}
          </h1>
          <p className="mt-[5px] text-[14.5px] text-ink-soft">
            12 niños · martes 17 jun
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mb-6 flex w-full cursor-pointer items-center gap-[14px] rounded-[18px] border border-border bg-surface px-[18px] py-[14px] text-left shadow-[0_4px_14px_-10px_rgba(120,90,60,.4)]"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-accent font-heading text-[16px] font-semibold text-white">
            {profile.initial}
          </span>
          <span className="flex-1 text-[15px] text-ink-muted">
            Comparte un momento…
          </span>
          <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl bg-accent-active-bg text-accent-action">
            <CameraIcon className="h-[19px] w-[19px]" />
          </span>
        </button>

        <div className="mb-[14px] flex items-center gap-[14px]">
          <span className="text-[12.5px] font-extrabold tracking-[.8px] text-ink-section">
            PUBLICADO HOY
          </span>
          <span className="h-px flex-1 bg-divider" />
        </div>

        <PostList posts={postList} />
      </div>

      {open && (
        <NewPostModal
          onClose={() => setOpen(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
