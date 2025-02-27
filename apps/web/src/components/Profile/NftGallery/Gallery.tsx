import MenuTransition from '@components/Shared/MenuTransition';
import { Menu } from '@headlessui/react';
import {
  ArrowsPointingOutIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Errors } from '@hey/data/errors';
import type { Nft, NftGallery } from '@hey/lens';
import {
  NftGalleriesDocument,
  useDeleteNftGalleryMutation,
  useNftGalleriesLazyQuery,
  useUpdateNftGalleryOrderMutation
} from '@hey/lens';
import { useApolloClient } from '@hey/lens/apollo';
import { Button } from '@hey/ui';
import cn from '@hey/ui/cn';
import { t, Trans } from '@lingui/macro';
import type { FC } from 'react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAppStore } from 'src/store/app';
import type { NftGalleryItem } from 'src/store/nft-gallery';
import { GALLERY_DEFAULTS, useNftGalleryStore } from 'src/store/nft-gallery';

import Create from './Create';
import NftCard from './NftCard';
import ReArrange from './ReArrange';

interface GalleryProps {
  galleries: NftGallery[];
}

const Gallery: FC<GalleryProps> = ({ galleries }) => {
  const [isRearrange, setIsRearrange] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const currentProfile = useAppStore((state) => state.currentProfile);
  const galleryStore = useNftGalleryStore((state) => state.gallery);
  const setGallery = useNftGalleryStore((state) => state.setGallery);

  const { cache } = useApolloClient();
  const gallery = galleries[0];
  const nfts = gallery.items;

  const [fetchNftGalleries] = useNftGalleriesLazyQuery();
  const [orderGallery] = useUpdateNftGalleryOrderMutation();
  const [deleteNftGallery] = useDeleteNftGalleryMutation({
    onCompleted: () => {
      toast.success(t`Gallery deleted`);
      setGallery(GALLERY_DEFAULTS);
    }
  });

  const onDelete = () => {
    try {
      if (confirm(t`Are you sure you want to delete?`)) {
        const normalizedId = cache.identify({
          id: gallery.id,
          __typename: 'NftGallery'
        });
        cache.evict({ id: normalizedId });
        cache.gc();
        deleteNftGallery({
          variables: {
            request: {
              profileId: currentProfile?.id,
              galleryId: gallery.id
            }
          }
        });
      }
    } catch (error: any) {
      toast.error(error?.messaage ?? Errors.SomethingWentWrong);
    }
  };

  const setItemsToGallery = (items: NftGalleryItem[]) => {
    setGallery({
      ...gallery,
      items,
      isEdit: true,
      toAdd: [],
      toRemove: [],
      alreadySelectedItems: items,
      reArrangedItems: []
    });
  };

  const onClickRearrange = () => {
    const items = nfts.map((nft) => {
      return {
        ...nft,
        itemId: `${nft.chainId}_${nft.contractAddress}_${nft.tokenId}`
      };
    });
    setIsRearrange(true);
    setItemsToGallery(items);
  };

  const onClickEditGallery = () => {
    setShowCreateModal(true);
    const items = nfts.map((nft) => {
      return {
        ...nft,
        itemId: `${nft.chainId}_${nft.contractAddress}_${nft.tokenId}`
      };
    });
    setItemsToGallery(items);
  };

  const onSaveRearrange = async () => {
    try {
      const updates = galleryStore.reArrangedItems?.map(
        ({ tokenId, contractAddress, chainId, newOrder }, i) => {
          return { tokenId, contractAddress, chainId, newOrder: newOrder ?? i };
        }
      );

      await orderGallery({
        variables: {
          request: {
            galleryId: galleryStore.id,
            profileId: currentProfile?.id,
            updates
          }
        }
      });

      const { data } = await fetchNftGalleries({
        variables: { request: { profileId: currentProfile?.id } }
      });

      cache.modify({
        fields: {
          nftGalleries: () => {
            cache.updateQuery({ query: NftGalleriesDocument }, () => ({
              data: data?.nftGalleries as NftGallery[]
            }));
          }
        }
      });
      setIsRearrange(false);
    } catch (error: any) {
      toast.error(error?.messaage ?? Errors.SomethingWentWrong);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h6 className="line-clamp-1 text-lg font-medium">
          {isRearrange ? 'Arrange gallery' : gallery.name}
        </h6>
        {galleryStore?.isEdit ? (
          <Create
            showModal={showCreateModal}
            setShowModal={setShowCreateModal}
          />
        ) : null}
        {isRearrange ? (
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setIsRearrange(false)}
              size="sm"
              variant="secondary"
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button onClick={onSaveRearrange} size="sm">
              <Trans>Save</Trans>
            </Button>
          </div>
        ) : currentProfile && currentProfile?.id === gallery.profileId ? (
          <Menu as="div" className="relative">
            <Menu.Button className="rounded-md p-1 hover:bg-gray-300/20">
              <EllipsisVerticalIcon className="h-4 w-4" />
            </Menu.Button>
            <MenuTransition>
              <Menu.Items
                static
                className="absolute right-0 z-[5] mt-1 rounded-xl border bg-white py-1 shadow-sm focus:outline-none dark:border-gray-700/80 dark:bg-gray-900"
              >
                <Menu.Item
                  as="div"
                  onClick={onClickEditGallery}
                  className={({ active }) =>
                    cn(
                      { 'dropdown-active': active },
                      'm-2 block cursor-pointer rounded-lg px-2 py-1.5 text-sm'
                    )
                  }
                >
                  <div className="flex items-center space-x-2">
                    <PencilSquareIcon className="h-4 w-4" />
                    <div>
                      <Trans>Edit</Trans>
                    </div>
                  </div>
                </Menu.Item>
                <Menu.Item
                  as="div"
                  onClick={onClickRearrange}
                  className={({ active }) =>
                    cn(
                      { 'dropdown-active': active },
                      'm-2 block cursor-pointer rounded-lg px-2 py-1.5 text-sm'
                    )
                  }
                >
                  <div className="flex items-center space-x-2">
                    <ArrowsPointingOutIcon className="h-4 w-4" />
                    <div>
                      <Trans>Rearrrange</Trans>
                    </div>
                  </div>
                </Menu.Item>
                <Menu.Item
                  as="div"
                  onClick={onDelete}
                  className={({ active }) =>
                    cn(
                      { 'dropdown-active': active },
                      'm-2 block cursor-pointer rounded-lg px-2 py-1.5 text-sm'
                    )
                  }
                >
                  <div className="flex items-center space-x-2">
                    <TrashIcon className="h-4 w-4" />
                    <div>
                      <Trans>Delete</Trans>
                    </div>
                  </div>
                </Menu.Item>
              </Menu.Items>
            </MenuTransition>
          </Menu>
        ) : null}
      </div>
      {isRearrange ? (
        <ReArrange />
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {nfts?.map((nft) => (
            <div
              key={`${nft?.chainId}_${nft?.contractAddress}_${nft?.tokenId}`}
              className="break-inside flex w-full items-center overflow-hidden text-white"
            >
              <NftCard nft={nft as Nft} linkToDetail />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default Gallery;
