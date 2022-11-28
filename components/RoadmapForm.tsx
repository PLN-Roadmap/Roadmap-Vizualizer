import { useRouter } from 'next/router';
import { Button, FormControl, FormErrorMessage, Input, InputGroup, InputLeftElement, InputRightElement, Text } from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons'
import { useEffect, useState } from 'react';

import { useGlobalLoadingState } from '../hooks/useGlobalLoadingState';
import styles from './RoadmapForm.module.css'
import theme from './theme/constants'
import { setCurrentIssueUrl, useCurrentIssueUrl } from '../hooks/useCurrentIssueUrl';
import { isEmpty } from 'lodash';
import { paramsFromUrl } from '../lib/paramsFromUrl';
import { getValidUrlFromInput } from '../lib/getValidUrlFromInput';
import { useViewMode } from '../hooks/useViewMode';
import { ViewMode } from '../lib/enums';

export function RoadmapForm() {
  const router = useRouter();
  const globalLoadingState = useGlobalLoadingState();
  const currentIssueUrl = useCurrentIssueUrl();
  const [issueUrl, setIssueUrl] = useState<string | null>();
  const [error, setError] = useState<Error | null>(null);
  const [isInputBlanked, setIsInputBlanked] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(globalLoadingState.get());
  const viewMode = useViewMode() as ViewMode;

  useEffect(() => {
    if (!isInputBlanked && isEmpty(currentIssueUrl) && window.location.pathname.length > 1) {
      try {
        const urlObj = getValidUrlFromInput(window.location.pathname.replace('/roadmap', ''));
        setCurrentIssueUrl(urlObj.toString());
      } catch {}
    }
  }, [currentIssueUrl, getValidUrlFromInput, setCurrentIssueUrl])

  useEffect(() => {
    const asyncFn = async () => {
      if (router.isReady) {
        if (!issueUrl) return;
        try {
          const params = paramsFromUrl(issueUrl);
          if (params) {
            const { owner, repo, issue_number } = params;
            setIssueUrl(null);
            if (window.location.pathname.includes(`github.com/${owner}/${repo}/issues/${issue_number}`)) {
              setTimeout(() => {
                /**
                 * Clear the error after a few seconds.
                 */
                setError(null);
              }, 5000);
              throw new Error('Already viewing this issue');
            }
            await router.push(`/roadmap/github.com/${owner}/${repo}/issues/${issue_number}#${viewMode}`);
            setIsLoading(false);
          }
        } catch (err) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };
    asyncFn();
  }, [router, issueUrl, setCurrentIssueUrl]);

  const formSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (currentIssueUrl == null) {
        throw new Error('currentIssueUrl is null');
      }
      const newUrl = getValidUrlFromInput(currentIssueUrl);
      setIssueUrl(newUrl.toString());
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }

  let inputRightElement = (
    <Button type="submit" isLoading={globalLoadingState.get()} className={styles.formSubmitButton} border="1px solid #8D8D8D" borderRadius="4px"  bg="rgba(141, 141, 141, 0.3)" onClick={formSubmit}>
      <Text p="6px 10px" color="white">⏎</Text>
    </Button>
  );

  const onChangeHandler = (e) => {
    setIsInputBlanked(true);
    setCurrentIssueUrl(e.target.value ?? '')
  };
  return (
    <form onSubmit={formSubmit}>
      <FormControl isInvalid={error != null} isDisabled={isLoading || globalLoadingState.get()}>
        <InputGroup>
          <InputLeftElement
            pointerEvents='none'
            children={<SearchIcon color='#FFFFFF' />}
          />
          <Input
            type="text"
            value={currentIssueUrl}
            className={styles.urlInput}
            color={theme.light.header.input.text.color}
            aria-label='Issue URL'
            name='issue-url'
            autoComplete='url'
            onChange={onChangeHandler}
            placeholder='https://github.com/...'
            bg={theme.light.header.input.background.color}
            borderColor={theme.light.header.input.border.color}
            borderRadius={theme.light.header.input.border.radius}
          />
          <InputRightElement cursor="pointer" children={inputRightElement}/>
        </InputGroup>
        <FormErrorMessage>{error?.message}</FormErrorMessage>
      </FormControl>
    </form>
  );
}
