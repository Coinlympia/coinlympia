import type { NextPage } from 'next';

import { AnimatedTabs } from '@/components/animated/AnimatedTabs';
import RankingList from '@/modules/coinleague/components/RankingList';
import RankingListItemSkeleton from '@/modules/coinleague/components/RankingListItemSkeleton';
import { RoomType } from '@/modules/coinleague/constants/enums';
import { useGameProfilesState } from '@/modules/coinleague/hooks/coinleague';
import { RankingType, useRanking } from '@/modules/coinleague/hooks/ranking';
import AppPageHeader from '@/modules/common/components/AppPageHeader';
import MainLayout from '@/modules/common/components/layouts/MainLayout';
import { useWeb3React } from '@dexkit/wallet-connectors/hooks/useWeb3React';
import { List, Stack, Tab } from '@mui/material';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';

const RankingPage: NextPage = () => {
  const { chainId } = useWeb3React();

  const [room, setRoom] = useState(RoomType.Stable);
  const isNFT = room === RoomType.Stable ? false : true;

  const [tab, setTab] = useState<RankingType>(RankingType.MostWinner);

  const rankingQuery = useRanking(tab, isNFT, chainId);

  const { profiles } = useGameProfilesState(
    rankingQuery.data?.map((p) => p.id),
  );

  const handleChangeTab = (_event: any, newValue: RankingType) => {
    setTab(newValue);
  };

  return (
    <>
      <MainLayout>
        <Stack spacing={2}>
          <AppPageHeader
            breadcrumbs={[
              {
                caption: <FormattedMessage id="home" defaultMessage="Home" />,
                uri: '/',
              },
              {
                caption: (
                  <FormattedMessage
                    id="coin.league"
                    defaultMessage="Coinlympia"
                  />
                ),
                uri: '/',
              },
              {
                caption: (
                  <FormattedMessage id="ranking" defaultMessage="Ranking" />
                ),
                uri: '/ranking',
                active: true,
              },
            ]}
          />

          <AnimatedTabs
            scrollButtons="auto"
            value={tab}
            onChange={handleChangeTab}
            variant="scrollable"
            sx={{
              '& .MuiTabs-indicator': {
                display: 'none',
              },
            }}
          >
            <Tab
              value={RankingType.MostWinner}
              label={
                <FormattedMessage
                  id="most.won"
                  defaultMessage="Most Won"
                />
              }
            />
            <Tab
              value={RankingType.MostJoined}
              label={
                <FormattedMessage
                  id="most.joined"
                  defaultMessage="Most Joined"
                />
              }
            />
            <Tab
              value={RankingType.MostEarned}
              label={
                <FormattedMessage
                  id="most.earned"
                  defaultMessage="Most Earned"
                />
              }
            />
            <Tab
              value={RankingType.MostProfit}
              label={
                <FormattedMessage
                  id="most.profit"
                  defaultMessage="Most Profit"
                />
              }
            />
          </AnimatedTabs>

          {rankingQuery.isLoading ? (
            <List disablePadding>
              <RankingListItemSkeleton />
              <RankingListItemSkeleton />
              <RankingListItemSkeleton />
              <RankingListItemSkeleton />
              <RankingListItemSkeleton />
              <RankingListItemSkeleton />
            </List>
          ) : (
            rankingQuery.data &&
            profiles && (
              <RankingList
                profiles={profiles}
                ranking={rankingQuery.data}
                chainId={chainId}
              />
            )
          )}
        </Stack>
      </MainLayout>
    </>
  );
};

export default RankingPage;
