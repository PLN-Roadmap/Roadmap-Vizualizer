import { Box } from '@chakra-ui/react';
import type { InferGetServerSidePropsType } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { none, State, useHookstate } from '@hookstate/core';

import PageHeader from '../../components/layout/PageHeader';
import { RoadmapTabbedView } from '../../components/roadmap-grid/RoadmapTabbedView';
import NewRoadmap from '../../components/roadmap/NewRoadmap';
import { BASE_PROTOCOL, BASE_URL } from '../../config/constants';
import { IssueData, PendingChildren, QueryParameters, RoadmapApiResponse, RoadmapApiResponseFailure, RoadmapApiResponseSuccess, RoadmapServerSidePropsResult, StarMapsIssueErrorsGrouped } from '../../lib/types';
import { ErrorNotificationDisplay } from '../../components/errors/ErrorNotificationDisplay';
import { ViewMode } from '../../lib/enums';
import { setViewMode } from '../../hooks/useViewMode';
import { DateGranularityState } from '../../lib/enums';
import { setDateGranularity } from '../../hooks/useDateGranularity';
import { useGlobalLoadingState } from '../../hooks/useGlobalLoadingState';
import { paramsFromUrl } from '../../lib/paramsFromUrl';
import { findIssueDataByUrl } from '../../lib/findIssueDataByUrl';
import { addToChildren } from '../../lib/backend/addToChildren';

export async function getServerSideProps(context): Promise<RoadmapServerSidePropsResult> {
  const [hostname, owner, repo, _, issue_number] = context.query.slug;
  const { filter_group, mode, timeUnit }: QueryParameters = context.query;

  return {
    props: {
      owner,
      repo,
      issue_number,
      isLocal: process.env.IS_LOCAL === 'true',
      groupBy: filter_group || null,
      mode: mode || 'grid',
      dateGranularity: timeUnit || DateGranularityState.Months,
      baseUrl: `${BASE_PROTOCOL}://${process.env.VERCEL_URL}`,
    }
  }
}

export default function RoadmapPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { error: serverError, baseUrl, isLocal, mode, dateGranularity, issue_number, repo, owner } = props;

  const starMapsErrorsState = useHookstate<StarMapsIssueErrorsGrouped[]>([]);
  const roadmapLoadErrorState = useHookstate<{ code: string; message: string } | null>(null)
  const issueDataState = useHookstate<IssueData | null>(null);
  const pendingChildrenState = useHookstate<PendingChildren[]>([])
  const asyncIssueDataState = useHookstate<IssueData[]>([])
  const globalLoadingState = useGlobalLoadingState();
  const [isRootIssueLoading, setIsRootIssueLoading] = useState(true);
  const [isPendingChildrenLoading, setIsPendingChildrenLoading] = useState(false);

  const errors = starMapsErrorsState.get({ noproxy: true });
  const roadmapLoadError = roadmapLoadErrorState.get({noproxy: true});

  useEffect(() => {
    if (globalLoadingState.get()) return;
    const fetchRoadMap = async () => {
      setIsRootIssueLoading(true);
      globalLoadingState.start();
      const roadmapApiUrl = `${window.location.origin}/api/roadmap?owner=${owner}&repo=${repo}&issue_number=${issue_number}`
      try {
        const apiResult = await fetch(new URL(roadmapApiUrl))
        const roadmapResponse: RoadmapApiResponse = await apiResult.json();

        const roadmapResponseSuccess = roadmapResponse as RoadmapApiResponseSuccess;
        const roadmapResponseFailure = roadmapResponse as RoadmapApiResponseFailure;
        if (roadmapResponse.errors) {
          starMapsErrorsState.set(roadmapResponse.errors);
        }
        if (roadmapResponseSuccess.pendingChildren.length > 0) {
          pendingChildrenState.set(roadmapResponseSuccess.pendingChildren)
        }

        if (roadmapResponseFailure.error != null) {
          roadmapLoadErrorState.set(roadmapResponseFailure.error);
        } else {
          issueDataState.set(roadmapResponseSuccess.data);
        }

      } catch (err) {
        console.log(`Error fetching ${roadmapApiUrl}`, err);
        roadmapLoadErrorState.set({code: `Error fetching ${roadmapApiUrl}`, message: `Error fetching ${roadmapApiUrl}: ${(err as Error).toString()}`})
      }
      setIsRootIssueLoading(false);
      globalLoadingState.stop();
    };

    fetchRoadMap();

  }, [issue_number, repo, owner]);

  useEffect(() => {
    if (isPendingChildrenLoading) return;
    const pendingChildren = pendingChildrenState.get({noproxy: true});
    const fetchPendingChildren = async () => {
      setIsPendingChildrenLoading(true);

      globalLoadingState.start();
      for await (const typedPendingChild of pendingChildren) {
        const { issue_number, owner, repo } = paramsFromUrl(typedPendingChild.html_url)
        const requestBody = {
          issue_number,
          owner,
          repo,
          parent: findIssueDataByUrl(issueDataState.get() as IssueData, typedPendingChild.parentHtmlUrl)
        };
        const pendingChildApiUrl = new URL(`${baseUrl}/api/pendingChild`);

        try {
          const apiResult = await fetch(pendingChildApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          const pendingChildResponse: IssueData | {error: Error} = await apiResult.json();
          const pendingChildFailure = pendingChildResponse as {error: Error};
          const pendingChildSuccess = pendingChildResponse as IssueData;
          if (pendingChildFailure.error != null) {
            roadmapLoadErrorState.set({ code: pendingChildFailure.error.name, message: pendingChildFailure.error.message });
          } else {
            asyncIssueDataState.merge([pendingChildSuccess]);
          }
        } catch (err) {
          roadmapLoadErrorState.set({code: `Error fetching ${pendingChildApiUrl}`, message: `Error fetching ${pendingChildApiUrl}: ${(err as Error).toString()}`})
        }
      }

      globalLoadingState.stop();
      setIsPendingChildrenLoading(false);
    };
    fetchPendingChildren();
  }, [issue_number, repo, owner, isRootIssueLoading]);

  /**
   * Add asyncIssueData items to issueDataState
   */
  useEffect(() => {
    const issueData = issueDataState.get({noproxy: true}) as IssueData;
    const asyncIssues = asyncIssueDataState.get();
    if (asyncIssues.length === 0) {
      return
    }
    let newIssueData = asyncIssueDataState[0];
    if (newIssueData !== undefined) {
      try {
        const parentIndex = issueData.children.findIndex((potentialParent) => {
          return potentialParent.html_url === newIssueData.parent.html_url.value
        });
        if (parentIndex > -1) {
          (issueDataState as State<IssueData>).children[parentIndex].children.merge([newIssueData.get({noproxy: true})]);
        } else {
          throw new Error('Could not find parentIndex');
        }

      } catch (err) {
        console.log('getting parent - error', err);
        console.log('getting parent - error - issueData', issueData);
        // keep.push(newIssueData)
      }
      asyncIssueDataState[0].set(none)
    }

  }, [asyncIssueDataState.value])

  useEffect(() => {
    setDateGranularity(dateGranularity);
  }, [dateGranularity, setDateGranularity]);

  const router = useRouter();
  const urlPath = router.asPath
  useEffect(() => {
    const hashString = urlPath.split('#')[1] as ViewMode ?? ViewMode.Simple;
    setViewMode(hashString);
  }, [urlPath])

  return (
    <>
      <PageHeader />
      <ErrorNotificationDisplay errors={errors ?? []} />
      <Box pt={5} pr="120px" pl="120px">
        {!!serverError && <Box color='red.500'>{serverError.message}</Box>}
        {!!roadmapLoadError && <Box color='red.500'>{roadmapLoadError.message}</Box>}
        {!!issueDataState.ornull && mode === 'd3' && <NewRoadmap issueData={issueDataState.get({noproxy: true}) as IssueData} isLocal={isLocal} />}
        {!!issueDataState.ornull && mode === 'grid' && (
          <RoadmapTabbedView issueDataState={issueDataState as State<IssueData>} isPendingChildrenLoading={isPendingChildrenLoading} isRootIssueLoading={isRootIssueLoading}/>
        )}
      </Box>
    </>
  );
}
