import { Octokit } from "@octokit/core";
import { GITHUB_TOKEN, REPO_OWNER, REPO_NAME } from "@/config/config";
import type {
  RepositoryDiscussions,
  DiscussionContent,
  RepositoryDiscussionCategories,
} from "./interface";

/**
 * 获取 discussions 通用方法
 * 注意：由于 github 速率限制，每次最多只能获取 100条数据
 */

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

const config = {
  client: octokit,
  owner: REPO_OWNER,
  repo: REPO_NAME,
};

interface QueryDiscussions {
  first?: number;
  after?: string | null;
  categoryId?: string | null;
  body?: boolean;
}

/**
 * 查询 discussions
 * @param first 每页数量
 * @param after 游标
 * @param categoryId 分类
 * @param body 是否查询 body
 * @returns
 */
export const queryDiscussions = ({
  first = 100,
  after = null,
  categoryId = null,
  body = false,
}: QueryDiscussions) => {
  return config.client.graphql<RepositoryDiscussions>(
    `query queryDiscussions($first: Int!, $after: String = null, $categoryId: ID = null, $body: Boolean = false) {
      repository(owner: "${config.owner}", name: "${config.repo}") {
        discussions(
          first: $first, 
          after: $after, 
          categoryId: $categoryId,
          orderBy: { field: CREATED_AT, direction: DESC }
        ) {
          pageInfo {
            endCursor
            hasNextPage
          }
          nodes {
            title
            number
            createdAt
            updatedAt
            url
            body @include(if: $body) 
            labels(first: 10) {
              nodes {
                color
                name
              }
            }
          }
        }
      }
    }
    `,
    {
      first,
      after,
      categoryId,
      body,
    }
  );
};

// 请求所有的分类
export const queryDiscussionCategories = () =>
  config.client.graphql<RepositoryDiscussionCategories>(
    /* GraphQL */ `
      query queryDiscussionCategories($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          discussionCategories(first: 100) {
            nodes {
              id
              name
            }
          }
        }
      }
    `,
    {
      owner: config.owner,
      name: config.repo,
    }
  );


/**
 * 递归循环获取所有 discussions
 * <由于 github 速率限制，故出此下策>
 * @param first 每页数量
 * @param after 游标
 * @param categoryId 分类
 * @param body 是否查询 body
 * @returns
 */
export const queryAllDiscussions: (
  opt?: QueryDiscussions
) => Promise<DiscussionContent[]> = async ({
  first = 100,
  after = null,
  categoryId = null,
  body = false,
} = {}) => {
  const discussions = [];
  const res = await queryDiscussions({
    first,
    after,
    categoryId,
    body,
  });
  if (
    res?.repository?.discussions?.nodes &&
    res.repository.discussions.nodes.length > 0
  ) {
    discussions.push(...res.repository.discussions.nodes);
  }
  if (res?.repository?.discussions?.pageInfo?.hasNextPage) {
    const tempArr = await queryAllDiscussions({
      first,
      after: res.repository.discussions.pageInfo.endCursor,
      categoryId,
      body,
    });

    discussions.push(...tempArr);
  }
  return discussions;
};

type DiscussionParams = Omit<QueryDiscussions, "categoryId"> & {
  categoryName: string;
};

// 按分类名称来获取 discussions
export const queryDiscussionsByCategoryName = async (
  params: DiscussionParams
) => {
  const { categoryName, ...rest } = params;
  const categories = await queryDiscussionCategories();
  const categoryId = categories.repository.discussionCategories.nodes.find(
    (c) => c.name === params.categoryName
  )?.id;
  if (!categoryId) {
    throw new Error("分类不存在");
  }
  return queryAllDiscussions({
    ...rest,
    categoryId,
  });
};

/**
 * 创建缓存
 * 创建缓存的目的是为了避免重复请求
 * ---
 * 在每次构建的时候，请求一次，然后缓存结果，其他的使用，统一从缓存中获取即可
 */
const cache = new Map<string, unknown>();

/**
 * 实际上，我只用得上一次请求。
 * - 包含指定分类得，所有数据即可
 * - 然后将这个数进行缓存
 * - 最后只需要暴露这个一个方法就行了
 */

const queryBlogs = async (params: DiscussionParams) => {
  const key = JSON.stringify(params);
  if (cache.has(key)) {
    return cache.get(key) as DiscussionContent[];
  }

  const res = await queryDiscussionsByCategoryName(params);
  cache.set(key, res);
  return res;
}

export default queryBlogs