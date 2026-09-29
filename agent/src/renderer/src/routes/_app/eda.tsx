/**
 * `/eda` 路由 —— EDA Workbench。
 *
 * EDA 是一个全屏工作台,所以把 layout 里的 `<main>` 内边距清掉,
 * 整个视口交给 EDAPage 自由布局(它在内部管 TopBar / Sidebar / Tabs / Editor / RightPanel)。
 */

import { createFileRoute } from '@tanstack/react-router';

import { EDAPage } from '../../components/gui/EDAPage';

function EDAView(): React.JSX.Element {
  return <EDAPage />;
}

export const Route = createFileRoute('/_app/eda')({
  component: EDAView,
});
