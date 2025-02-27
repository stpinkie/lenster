import Loader from '@components/Shared/Loader';
import UserProfile from '@components/Shared/UserProfile';
import { UsersIcon } from '@heroicons/react/24/outline';
import { FollowUnfollowSource } from '@hey/data/tracking';
import type { FollowingRequest, Profile } from '@hey/lens';
import { useFollowingQuery } from '@hey/lens';
import formatHandle from '@hey/lib/formatHandle';
import { EmptyState, ErrorMessage } from '@hey/ui';
import { t, Trans } from '@lingui/macro';
import { motion } from 'framer-motion';
import type { FC } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useAppStore } from 'src/store/app';

interface FollowingProps {
  profile: Profile;
  onProfileSelected?: (profile: Profile) => void;
}

const Following: FC<FollowingProps> = ({ profile, onProfileSelected }) => {
  // Variables
  const request: FollowingRequest = { address: profile?.ownedBy, limit: 50 };
  const currentProfile = useAppStore((state) => state.currentProfile);

  const { data, loading, error, fetchMore } = useFollowingQuery({
    variables: { request },
    skip: !profile?.id
  });

  const followings = data?.following?.items;
  const pageInfo = data?.following?.pageInfo;
  const hasMore = pageInfo?.next;

  const onEndReached = async () => {
    if (!hasMore) {
      return;
    }

    await fetchMore({
      variables: { request: { ...request, cursor: pageInfo?.next } }
    });
  };

  if (loading) {
    return <Loader message={t`Loading following`} />;
  }

  if (followings?.length === 0) {
    return (
      <EmptyState
        message={
          <div>
            <span className="mr-1 font-bold">
              @{formatHandle(profile?.handle)}
            </span>
            <span>
              <Trans>doesn’t follow anyone.</Trans>
            </span>
          </div>
        }
        icon={<UsersIcon className="text-brand h-8 w-8" />}
        hideCard
      />
    );
  }

  return (
    <div
      className="max-h-[80vh] overflow-y-auto"
      data-testid="followings-modal"
    >
      <ErrorMessage
        className="m-5"
        title={t`Failed to load following`}
        error={error}
      />
      <Virtuoso
        className="virtual-profile-list"
        data={followings}
        endReached={onEndReached}
        itemContent={(index, following) => {
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`p-5 ${
                onProfileSelected &&
                'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900'
              }`}
              onClick={
                onProfileSelected && following.profile
                  ? () => {
                      onProfileSelected(following.profile as Profile);
                    }
                  : undefined
              }
              aria-hidden="true"
            >
              <UserProfile
                profile={following?.profile as Profile}
                linkToProfile={!onProfileSelected}
                isFollowing={following?.profile?.isFollowedByMe}
                followUnfollowPosition={index + 1}
                followUnfollowSource={FollowUnfollowSource.FOLLOWING_MODAL}
                showBio
                showFollow={currentProfile?.id !== following?.profile.id}
                showUnfollow={currentProfile?.id !== following?.profile.id}
                showUserPreview={false}
              />
            </motion.div>
          );
        }}
      />
    </div>
  );
};

export default Following;
