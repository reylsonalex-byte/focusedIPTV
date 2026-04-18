import { router, type Href } from 'expo-router';

type RouteParams = Record<string, string | number | boolean | null | undefined>;

const encodeParams = (params: RouteParams) =>
  encodeURIComponent(JSON.stringify(params));

export const pushProtectedRoute = (
  pathname: Href,
  params: RouteParams,
  requiresPin: boolean
) => {
  if (requiresPin) {
    router.push({
      pathname: '/pin-gate',
      params: {
        next: typeof pathname === 'string' ? pathname : String(pathname),
        payload: encodeParams(params),
      },
    });
    return;
  }

  router.push({
    pathname,
    params,
  });
};

export const replaceRoute = (pathname: Href, params: RouteParams = {}) => {
  router.replace({
    pathname,
    params,
  });
};
