import * as stylex from "@stylexjs/stylex";
import { Layout } from "@ui";
import { t } from "../i18n/index.ts";
import { a11y } from "../styles/a11y.ts";
import { board } from "../styles/board.ts";

export function WorkspaceSkeleton() {
  return (
    <Layout.Grid
      grow
      shrink
      basis="0%"
      align="center"
      justifyItems="center"
      sx={board.workspace}
      aria-busy="true"
      aria-live="polite"
    >
      <Layout.Grid
        alignContent="center"
        gap="xxxl"
        sx={[board.artboard, board.card]}
      >
        <div {...stylex.props(board.skeleton, board.skeletonLine)} />
        <div {...stylex.props(board.skeleton, board.skeletonImage)} />
      </Layout.Grid>
      <span {...stylex.props(a11y.visuallyHidden)}>{t("loadingArtboard")}</span>
    </Layout.Grid>
  );
}
