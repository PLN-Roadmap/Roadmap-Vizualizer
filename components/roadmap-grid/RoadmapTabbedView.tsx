import {
  Box,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs
} from '@chakra-ui/react';
import { State } from '@hookstate/core';
import { useRouter } from 'next/router';

import { setViewMode, useViewMode } from '../../hooks/useViewMode';
import { DEFAULT_INITIAL_VIEW_MODE } from '../../lib/defaults';
import { ViewMode } from '../../lib/enums';
import { IssueData } from '../../lib/types';
import Header from './header';
import styles from './Roadmap.module.css';
import { RoadmapDetailed } from './RoadmapDetailedView';

export function RoadmapTabbedView({ issueDataState, isRootIssueLoading, isPendingChildrenLoading }: { issueDataState: State<IssueData>, isRootIssueLoading: boolean, isPendingChildrenLoading: boolean }) {
  if (issueDataState.children.length === 0) {
    return (<></>);
  }
  const viewMode = useViewMode() || DEFAULT_INITIAL_VIEW_MODE;
  const router = useRouter();
  // Defining what tabs to show and in what order
  const tabs = ['Overview', 'Detailed View'] as const;

  // Mapping the views to the tabs
  const tabViewMap: Record<typeof tabs[number], ViewMode> = {
    'Overview': ViewMode.Simple,
    'Detailed View': ViewMode.Detail,
  };

  // Mapping the tabs to the views
  const tabViewMapInverse: Record<ViewMode, number> = tabs.reduce((acc, tab, index) => {
    acc[tabViewMap[tab]] = index;
    return acc;
  }, {} as Record<ViewMode, number>);

  const tabIndexFromViewMode = tabViewMapInverse[viewMode]

  const handleTabChange = (index: number) => {
    setViewMode(tabViewMap[tabs[index]]);
    router.push({
      hash: tabViewMap[tabs[index]],
    }, undefined, { shallow: true });
  }

  const renderTab = (title: string, index: number) => (
    <Tab
      key={index}
      _selected={{
        fontWeight: 'bold',
        textUnderlineOffset: '16px',
        textDecorationLine: 'underline',
        textDecorationThickness: '2px',
      }}
    >&nbsp;&nbsp;{title}&nbsp;&nbsp;</Tab>
  );

  const renderTabPanel = (_title: string, index: number) => (
    <TabPanel key={index}>
      <RoadmapDetailed issueDataState={issueDataState} />
    </TabPanel>
  );

  return (
    <>
      <Box className={styles.timelineBox}>
        <Header issueDataState={issueDataState} isPendingChildrenLoading={isPendingChildrenLoading} isRootIssueLoading={isRootIssueLoading}/>
        <Tabs variant='unstyled' onChange={handleTabChange} index={tabIndexFromViewMode} isLazy>
          <TabList>
            {tabs.map(renderTab)}
          </TabList>
          <TabPanels>
            {tabs.map(renderTabPanel)}
          </TabPanels>
        </Tabs>
      </Box>
    </>
  );
}
