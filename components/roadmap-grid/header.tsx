import Image from 'next/image';
import { Link, Text, Flex, Spacer, Center, Spinner } from '@chakra-ui/react';
import NextLink from 'next/link'

import themes from '../theme/constants';
import GitHubSvgIcon from '../icons/GitHubLogo.svg';
import { IssueData } from '../../lib/types';
import { State } from '@hookstate/core';

export default function Header({ issueDataState, isRootIssueLoading, isPendingChildrenLoading }: { issueDataState: State<IssueData>, isRootIssueLoading: boolean, isPendingChildrenLoading: boolean }) {
  if (issueDataState.html_url.value == null || typeof issueDataState.html_url.value !== 'string') {
    console.log('error with issueData', issueDataState.get({noproxy: true}))
    return null;
  }

  return (
    <>
      <Flex direction={'row'}>
        <Text as='span' mb='8px' fontSize={40} fontWeight={600} pr="5rem">
          {issueDataState.title.value} {isRootIssueLoading || isPendingChildrenLoading ? <Spinner /> : null}
        </Text>
        <Spacer />
        <Center>
          <NextLink style={{display: 'span'}} passHref href={issueDataState.get().html_url}>
            <Link target="_blank" rel="noopener noreferrer">
              <Center minWidth="9rem">
                <Text as='span' fontSize={15} fontWeight={400} color={themes.light.text.color} pr="0.5rem">View in GitHub</Text>
                <Image src={GitHubSvgIcon} alt="GitHub Logo" color={themes.light.text.color} width={24} height={24} />
              </Center>
            </Link>
          </NextLink>
        </Center>
      </Flex>
    </>
  );
}
