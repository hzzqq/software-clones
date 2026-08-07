// 检索语法的唯一实现放在服务端包内（服务端要用它拼 SQL），
// 客户端在此原样再导出，保证两端对同一条查询的解析结果完全一致——
// 与 src/types.ts 复用服务端类型是同一套做法。
export * from '../../../server/src/services/searchQuery';
