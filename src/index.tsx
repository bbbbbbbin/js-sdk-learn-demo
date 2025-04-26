import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { bitable, FieldType, IField, ITable, IView } from '@lark-base-open/js-sdk';
import { Alert, Button, Checkbox, Select, Space, Spin, Typography, message, Tag } from 'antd';
import { getDouyinVideoInfo } from './api';

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误捕获:', event.error);
  // 防止页面白屏，显示错误信息
  if (document.getElementById('root')?.innerHTML === '') {
    document.getElementById('root')!.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #f5222d;">应用加载失败</h2>
        <p>抱歉，应用加载过程中遇到了问题。请尝试刷新页面或联系管理员。</p>
        <p>错误信息: ${event.error?.message || '未知错误'}</p>
        <button onclick="location.reload()" style="padding: 8px 16px; background: #1890ff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          刷新页面
        </button>
      </div>
    `;
  }
});

// Promise错误处理
window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise错误:', event.reason);
});

const { Title, Text } = Typography;
const { Option } = Select;

// 定义状态字段
const STATUS_FIELD = { name: '处理状态', type: FieldType.Text };

// 定义字段映射关系
const FIELD_MAPPING = {
  'author': { name: '作者', type: FieldType.Text },
  'sec_uid': { name: '作者sec_uid', type: FieldType.Text },
  'time': { name: '发布时间', type: FieldType.Text },
  'caption': { name: '视频标题', type: FieldType.Text },
  'desc': { name: '视频描述', type: FieldType.Text },
  'duration': { name: '视频时长', type: FieldType.Text },
  'hashtags': { name: '话题标签', type: FieldType.Text },
  'tags': { name: '视频标签', type: FieldType.Text },
  'vediourl': { name: '视频链接', type: FieldType.Url },
  'cover': { name: '封面图片', type: FieldType.Url },
  'ocr': { name: 'OCR内容', type: FieldType.Text },
  'share': { name: '分享描述', type: FieldType.Text },
  'music': { name: '音乐链接', type: FieldType.Url },
  'collect_count': { name: '收藏数', type: FieldType.Number },
  'comment_count': { name: '评论数', type: FieldType.Number },
  'digg_count': { name: '点赞数', type: FieldType.Number },
  'share_count': { name: '分享数', type: FieldType.Number },
};

// 错误边界组件，用于捕获渲染错误
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('应用渲染错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h2 style={{ color: '#f5222d' }}>应用加载失败</h2>
          <p>抱歉，应用加载过程中遇到了问题。请尝试刷新页面或联系管理员。</p>
          <p>错误信息: {this.state.error?.message || '未知错误'}</p>
          <Button type="primary" onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <DouyinVideoApp />
    </ErrorBoundary>
  </React.StrictMode>
)

// 定义包含名称的状态类型
interface INamedItem {
  id: string;
  name: string;
}

function DouyinVideoApp() {
  // 状态管理 - 使用包含名称的类型
  const [tables, setTables] = useState<INamedItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>();
  const [selectedTableName, setSelectedTableName] = useState<string>('');
  const [views, setViews] = useState<INamedItem[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<string>();
  const [selectedViewName, setSelectedViewName] = useState<string>('');
  const [fields, setFields] = useState<INamedItem[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>();
  const [selectedFieldName, setSelectedFieldName] = useState<string>('');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorDetails, setErrorDetails] = useState<{ [recordId: string]: string }>({});
  const [initError, setInitError] = useState<string | null>(null);
  const [appReady, setAppReady] = useState(false);
  
  // 测试页面状态
  const [testVideoId, setTestVideoId] = useState<string>('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  // 初始化加载表格列表
  useEffect(() => {
    const loadTables = async () => {
      try {
        setLoading(true);
        setAppReady(true)
        console.log('开始加载表格列表...');
        // 添加超时处理
        const timeoutPromise = new Promise((_, reject) => {
         setTimeout(() => reject(new Error('加载表格超时，请检查网络连接')), 15000);
        });
        
        // 使用Promise.race实现超时控制
        const tableMetaListPromise = bitable.base.getTableMetaList();
        const tableMetaList = await Promise.race([tableMetaListPromise, timeoutPromise]) as any;
        
        if (!tableMetaList || !Array.isArray(tableMetaList)) {
          console.log('获取表格列表失败，返回数据格式错误，将显示测试页面');
          setTables([]);
          setLoading(false);
          setAppReady(true); // 标记应用已就绪
          return;
        }
        
        console.log(`获取到 ${tableMetaList.length} 个表格`);
        
        if (tableMetaList.length === 0) {
          console.log('没有检测到表格，将显示测试页面');
          setTables([]);
          setLoading(false);
          setAppReady(true); // 标记应用已就绪
          return;
        }
        
        const tableListRaw = await Promise.all(
          tableMetaList.map(meta => bitable.base.getTableById(meta.id))
        );

        // 获取表格名称
        const tableList = await Promise.all(
          tableListRaw.map(async (table) => ({
            id: table.id,
            name: await table.getName() || `未命名表 (${table.id.slice(-4)})`
          }))
        );
        
        console.log(`成功加载 ${tableList.length} 个表格`);
        setTables(tableList);
        setLoading(false);
        setAppReady(true); // 标记应用已就绪
      } catch (error) {
        console.error('加载表格失败:', error);
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        message.error(`加载表格失败: ${errorMsg}`);
        setInitError(`初始化失败: ${errorMsg}`);
        setTables([]);
        setAppReady(true);
        setLoading(false);
      }
    };
    loadTables();
  }, []);

  // 当选择表格变化时，加载视图列表
  useEffect(() => {
    const loadViews = async () => {
      if (!selectedTableId) {
        setViews([]);
        return;
      }

      try {
        setLoading(true);
        const table = await bitable.base.getTableById(selectedTableId);
        const viewMetaList = await table.getViewMetaList();
        const viewListRaw = await Promise.all(
          viewMetaList.map(meta => table.getViewById(meta.id))
        );

        // 获取视图名称
        const viewList = await Promise.all(
          viewListRaw.map(async (view) => ({
            id: view.id,
            name: await view.getName() || `未命名视图 (${view.id.slice(-4)})`
          }))
        );

        setViews(viewList);
        setLoading(false);
      } catch (error) {
        console.error('加载视图失败:', error);
        message.error('加载视图失败');
        setLoading(false);
      }
    };
    loadViews();
  }, [selectedTableId]);

  // 当选择视图变化时，加载字段列表
  useEffect(() => {
    const loadFields = async () => {
      if (!selectedTableId || !selectedViewId) {
        setFields([]);
        return;
      }

      try {
        setLoading(true);
        const table = await bitable.base.getTableById(selectedTableId);
        const view = await table.getViewById(selectedViewId);

        // 获取视图中可见的字段ID列表
        const visibleFieldIds = await view.getVisibleFieldIdList();

        // 获取所有字段
        const fieldListRaw = await Promise.all(
          visibleFieldIds.map(id => table.getFieldById(id))
        );

        // 获取字段名称
        const fieldList = await Promise.all(
          fieldListRaw.map(async (field) => ({
            id: field.id,
            name: await field.getName() || `未命名字段 (${field.id.slice(-4)})`
          }))
        );

        setFields(fieldList);
        setLoading(false);
      } catch (error) {
        console.error('加载字段失败:', error);
        message.error('加载字段失败');
        setLoading(false);
      }
    };
    loadFields();
  }, [selectedTableId, selectedViewId]);

  // Conditional rendering MUST come AFTER all hooks
  // 如果初始化失败，显示错误信息
  if (initError) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="应用初始化失败"
          description={<>
            <p>{initError}</p>
            <p>请尝试刷新页面或检查网络连接。如果问题持续存在，请联系管理员。</p>
          </>}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          }
        />
      </div>
    );
  }

  // 测试API功能
  const testApi = async () => {
    if (!testVideoId.trim()) {
      message.warning('请输入视频ID');
      return;
    }
    
    try {
      setTestLoading(true);
      const videoInfo = await getDouyinVideoInfo(testVideoId.trim());
      setTestResult(videoInfo);
      console.log('API测试结果:', videoInfo);
    } catch (error) {
      console.error('API测试失败:', error);
      message.error('API测试失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setTestLoading(false);
    }
  };

  // 提取视频ID并获取信息
  const processVideoIds = async () => {
    if (!selectedTableId || !selectedViewId || !selectedFieldId) {
      message.warning('请先选择表格、视图和字段');
      return;
    }

    try {
      setProcessing(true);
      // 添加错误处理
      let table;
      try {
        table = await bitable.base.getTableById(selectedTableId);
      } catch (error) {
        console.error('获取表格失败:', error);
        message.error('获取表格失败，请刷新页面重试');
        setProcessing(false);
        return;
      }
      
      let view;
      try {
        view = await table.getViewById(selectedViewId);
      } catch (error) {
        console.error('获取视图失败:', error);
        message.error('获取视图失败，请刷新页面重试');
        setProcessing(false);
        return;
      }
      
      let field;
      try {
        field = await table.getFieldById(selectedFieldId);
      } catch (error) {
        console.error('获取字段失败:', error);
        message.error('获取字段失败，请刷新页面重试');
        setProcessing(false);
        return;
      }

      // 获取视图中的记录ID列表
      console.log('正在获取记录ID列表...');
      let recordIds = [];
      try {
        recordIds = await view.getVisibleRecordIdList();
        console.log('获取到记录ID列表:', recordIds);
        if (!recordIds || recordIds.length === 0) {
          // 尝试使用替代方法获取记录
          console.log('尝试使用替代方法获取记录...');
          const records = await table.getRecords({});
          recordIds = records.records.map((record: { recordId: string }) => record.recordId);
          console.log('通过替代方法获取到记录ID列表:', recordIds);
        }
      } catch (error) {
        console.error('获取记录ID列表失败:', error);
        message.error('获取记录ID列表失败，尝试使用替代方法');
        try {
          // 尝试使用替代方法获取记录
          const records = await table.getRecords({});
          recordIds = records.records.map(record => record.recordId);
          console.log('通过替代方法获取到记录ID列表:', recordIds);
        } catch (fallbackError) {
          console.error('替代方法获取记录ID列表也失败:', fallbackError);
          message.error('无法获取记录，请检查表格是否有数据');
          setProcessing(false);
          return;
        }
      }

      if (!recordIds || recordIds.length === 0) {
        message.warning('未找到任何记录，请确认表格中有数据');
        setProcessing(false);
        return;
      }

      setProgress({ current: 0, total: recordIds.length });
      console.log(`准备处理 ${recordIds.length} 条记录`);

      // 创建或获取状态字段
      let statusField;
      try {
        const existingFields = await table.getFieldMetaList();
        const existingStatusField = existingFields.find(f => f.name === STATUS_FIELD.name);

        if (existingStatusField) {
          statusField = await table.getFieldById(existingStatusField.id);
        } else {
          // 创建新字段
          const newFieldId = await table.addField({
            type: FieldType.Text as FieldType.Text,
            name: STATUS_FIELD.name
          });
          statusField = await table.getFieldById(newFieldId);
        }
      } catch (error) {
        console.error(`创建字段 ${STATUS_FIELD.name} 失败:`, error);
        message.error(`创建字段 ${STATUS_FIELD.name} 失败`);
      }

      // 创建或获取所需字段
      const fieldMap = new Map();
      for (const [key, config] of Object.entries(FIELD_MAPPING)) {
        try {
          // 尝试查找现有字段
          const existingFields = await table.getFieldMetaList();
          const existingField = existingFields.find(f => f.name === config.name);

          if (existingField) {
            fieldMap.set(key, await table.getFieldById(existingField.id));
          } else {
            // 创建新字段
            const newFieldId = await table.addField({
              type: config.type as FieldType.Text | FieldType.Number | FieldType.Url,
              name: config.name
            });
            fieldMap.set(key, await table.getFieldById(newFieldId));
          }
        } catch (error) {
          console.error(`创建字段 ${config.name} 失败:`, error);
          message.error(`创建字段 ${config.name} 失败`);
        }
      }

      // 处理每条记录
      let successCount = 0;
      let failCount = 0;
      const newErrorDetails: { [recordId: string]: string } = {};

      for (let i = 0; i < recordIds.length; i++) {
        const recordId = recordIds[i] || "";
        setProgress({ current: i + 1, total: recordIds.length });

        try {
          // 更新状态为处理中
          if (statusField) {
            await statusField.setValue(recordId, '处理中...');
          }

          // 获取视频ID
          console.log(`正在获取记录 ${recordId} 的视频ID...`);
          const videoIdCell = await field.getValue(recordId);
          console.log(`获取到的原始单元格值:`, videoIdCell);
          
          // 检查单元格值类型
          if (videoIdCell === null) {
            const errorMsg = '视频ID为空';
            console.error(errorMsg);
            if (statusField) {
              await statusField.setValue(recordId, `失败: ${errorMsg}`);
            }
            newErrorDetails[recordId] = errorMsg;
            failCount++;
            continue;
          }
          
          // 根据不同的字段类型处理值
          let videoIdStr = '';
          
          // 如果是文本段落数组 (多行文本字段)
          if (Array.isArray(videoIdCell) && videoIdCell.length > 0 && 'type' in videoIdCell[0]) {
            console.log('检测到多行文本字段类型');
            // 尝试从文本段落中提取文本
            videoIdStr = videoIdCell.map((segment: any) => {
              if (segment.type === 'text') {
                return segment.text || '';
              } else if (segment.type === 'url') {
                return segment.link || segment.text || '';
              }
              return '';
            }).join('');
          } 
          // 如果是URL类型
          else if (Array.isArray(videoIdCell) && videoIdCell.length > 0 && 'link' in videoIdCell[0]) {
            console.log('检测到URL字段类型');
            videoIdStr = videoIdCell[0].link || '';
          }
          // 如果是普通字符串
          else if (typeof videoIdCell === 'string') {
            console.log('检测到字符串字段类型');
            videoIdStr = videoIdCell;
          }
          // 其他情况，尝试转换为字符串
          else {
            console.log('尝试将其他类型转换为字符串');
            try {
              // 尝试使用getCellString方法
              videoIdStr = await table.getCellString(field.id, recordId);
              console.log('通过getCellString获取到的值:', videoIdStr);
            } catch (e) {
              console.error('getCellString失败，尝试其他方法', e);
              // 如果getCellString失败，尝试JSON.stringify
              videoIdStr = JSON.stringify(videoIdCell);
            }
          }
          
          if (!videoIdStr || videoIdStr.trim() === '') {
            const errorMsg = '视频ID为空或格式错误';
            console.error(errorMsg);
            if (statusField) {
              await statusField.setValue(recordId, `失败: ${errorMsg}`);
            }
            newErrorDetails[recordId] = errorMsg;
            failCount++;
            continue;
          }
          
          // 提取视频ID - 支持完整URL或纯ID
          let videoId = videoIdStr.trim();
          console.log(`处理前的视频ID或链接: ${videoId}`);
          
          // 如果是URL，尝试提取ID
          if (videoId.includes('/')) {
            console.log('检测到URL格式，尝试提取视频ID');
            const matches = videoId.match(/\/video\/(\d+)/);
            if (matches && matches[1]) {
              console.log(`通过正则表达式提取到视频ID: ${matches[1]}`);
              videoId = matches[1];
            } else {
              // 尝试其他格式
              console.log('尝试通过URL路径分割提取视频ID');
              const segments = videoId.split('/');
              const lastSegment = segments[segments.length - 1];
              console.log(`URL最后一段: ${lastSegment}`);
              
              // 处理可能包含查询参数的情况
              if (lastSegment.includes('?')) {
                videoId = lastSegment.split('?')[0];
                console.log(`去除查询参数后的视频ID: ${videoId}`);
              } else {
                videoId = lastSegment;
              }
            }
          }
          
          if (!videoId) {
            const errorMsg = '无法从链接中提取视频ID';
            console.error(errorMsg);
            if (statusField) {
              await statusField.setValue(recordId, `失败: ${errorMsg}`);
            }
            newErrorDetails[recordId] = errorMsg;
            failCount++;
            continue;
          }
          
          console.log(`最终提取到的视频ID: ${videoId}`);
          
          // 获取视频信息
          console.log(`开始获取视频 ${videoId} 的信息...`);
          let videoInfo = null;
          try {
            videoInfo = await getDouyinVideoInfo(videoId);
            if (!videoInfo) {
              throw new Error('API返回空数据');
            }
          } catch (apiError) {
            const errorMsg = `获取视频信息失败: ${apiError instanceof Error ? apiError.message : '未知API错误'}`;
            console.error(errorMsg);
            if (statusField) {
              await statusField.setValue(recordId, `失败: ${errorMsg}`);
            }
            newErrorDetails[recordId] = errorMsg;
            failCount++;
            continue;
          }
          
          // 额外检查返回的数据是否有效
          if (!videoInfo.vediourl && !videoInfo.author) {
            const errorMsg = '获取的视频信息不完整，可能是API返回格式变更';
            console.error(errorMsg);
            if (statusField) {
              await statusField.setValue(recordId, `失败: ${errorMsg}`);
            }
            newErrorDetails[recordId] = errorMsg;
            failCount++;
            continue;
          }
          
          console.log(`成功获取视频信息:`, videoInfo);
          
          // 更新字段
          console.log(`开始更新记录 ${recordId} 的字段...`);
          for (const [key, field] of fieldMap.entries()) {
            if (key in videoInfo) {
              const value = videoInfo[key as keyof typeof videoInfo];
              console.log(`更新字段 ${key}，值:`, value);
              
              // 检查是否需要覆盖现有值
              if (overwriteExisting) {
                console.log(`覆盖模式：直接设置值`);
                try {
                  await field.setValue(recordId, value);
                  console.log(`字段 ${key} 更新成功`);
                } catch (error) {
                  console.error(`设置字段 ${key} 值失败:`, error);
                }
              } else {
                // 只有当单元格为空时才设置值
                console.log(`非覆盖模式：检查当前值`);
                try {
                  const currentValue = await field.getValue(recordId);
                  console.log(`字段 ${key} 当前值:`, currentValue);
                  
                  if (currentValue === null || currentValue === undefined || 
                      (Array.isArray(currentValue) && currentValue.length === 0) || 
                      currentValue === '') {
                    console.log(`字段 ${key} 为空，设置新值`);
                    await field.setValue(recordId, value);
                    console.log(`字段 ${key} 更新成功`);
                  } else {
                    console.log(`字段 ${key} 已有值，跳过更新`);
                  }
                } catch (error) {
                  console.error(`处理字段 ${key} 时出错:`, error);
                }
              }
            }
          }
          
          // 更新状态为成功
          if (statusField) {
            await statusField.setValue(recordId, '成功');
          }
          
          console.log(`记录 ${recordId} 处理完成`);
          successCount++;
        } catch (error) {
          console.error(`处理记录 ${recordId} 失败:`, error);
          const errorMsg = `处理失败: ${error instanceof Error ? error.message : '未知错误'}`;
          if (statusField) {
            await statusField.setValue(recordId, `失败: ${errorMsg}`);
          }
          newErrorDetails[recordId] = errorMsg;
          failCount++;
        }
      }

      setProcessing(false);
      setErrorDetails(newErrorDetails);
      message.success(`处理完成！成功: ${successCount}, 失败: ${failCount}`);

    } catch (error) {
      console.error('处理视频信息失败:', error);
      message.error('处理视频信息失败');
      setProcessing(false);
    }
  };

  // 渲染测试页面
  const renderTestPage = () => {
    console.log('渲染测试页面...');
    return (
      <div style={{ padding: '16px' }}>
        <Title level={4}>抖音视频信息API测试</Title>
        <Alert
          message="未检测到可用的数据表"
          description="您可以在此页面测试抖音视频信息获取API的功能。"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>输入抖音视频ID：</Text>
            <div style={{ display: 'flex', marginTop: '8px' }}>
              <input 
                type="text" 
                value={testVideoId}
                onChange={(e) => setTestVideoId(e.target.value)}
                placeholder="请输入视频ID或视频链接"
                style={{ 
                  flex: 1, 
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #d9d9d9',
                  marginRight: '8px'
                }}
              />
              <Button 
                type="primary" 
                onClick={testApi} 
                loading={testLoading}
                disabled={!testVideoId.trim()}
              >
                获取信息
              </Button>
            </div>
          </div>
          
          {testLoading && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin />
              <div style={{ marginTop: '8px' }}>正在获取视频信息...</div>
            </div>
          )}
          
          {!testLoading && testResult && (
            <div>
              <Text strong>API返回结果：</Text>
              <div 
                style={{ 
                  marginTop: '8px',
                  padding: '12px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px',
                  backgroundColor: '#f5f5f5',
                  maxHeight: '400px',
                  overflow: 'auto'
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
              
              {testResult.vediourl && (
                <div style={{ marginTop: '16px' }}>
                  <Text strong>视频链接：</Text>
                  <div style={{ marginTop: '8px' }}>
                    <a href={testResult.vediourl} target="_blank" rel="noopener noreferrer">
                      {testResult.vediourl}
                    </a>
                  </div>
                </div>
              )}
              
              {testResult.cover && (
                <div style={{ marginTop: '16px' }}>
                  <Text strong>封面图片：</Text>
                  <div style={{ marginTop: '8px' }}>
                    <img 
                      src={testResult.cover} 
                      alt="视频封面" 
                      style={{ maxWidth: '100%', maxHeight: '300px', border: '1px solid #d9d9d9' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </Space>
      </div>
    );
  };

  // 渲染主应用
  const renderMainApp = () => {
    return (
      <div style={{ padding: '16px' }}>
        <Title level={4}>抖音视频信息获取</Title>

        {/* 显示当前选择信息 */}
        {(selectedTableName || selectedViewName || selectedFieldName) && (
          <div style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {selectedTableName && (
                <div>
                  <Text type="secondary">当前数据表:</Text> <Tag color="blue">{selectedTableName}</Tag>
                </div>
              )}
              {selectedViewName && (
                <div>
                  <Text type="secondary">当前视图:</Text> <Tag color="green">{selectedViewName}</Tag>
                </div>
              )}
              {selectedFieldName && (
                <div>
                  <Text type="secondary">当前字段:</Text> <Tag color="purple">{selectedFieldName}</Tag>
                </div>
              )}
            </Space>
          </div>
        )}

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 表格选择 */}
          <div>
            <Text strong>选择数据表：</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择数据表"
              loading={loading}
              value={selectedTableId}
              onChange={(id) => {
                setSelectedTableId(id);
                const selectedTable = tables.find(table => table.id === id);
                setSelectedTableName(selectedTable?.name || '');
                // 清空后续选择
                setSelectedViewId(undefined);
                setSelectedViewName('');
                setViews([]);
                setSelectedFieldId(undefined);
                setSelectedFieldName('');
                setFields([]);
              }}
              labelInValue={false}
              disabled={processing}
              optionLabelProp="name" // 使用 name 作为标签
            >
              {tables.map(table => (
                <Option key={table.id} value={table.id} name={table.name}>
                  {table.name}
                </Option>
              ))}
            </Select>
          </div>

          {/* 视图选择 */}
          <div>
            <Text strong>选择视图：</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择视图"
              loading={loading}
              value={selectedViewId}
              onChange={(id) => {
                setSelectedViewId(id);
                const selectedView = views.find(view => view.id === id);
                setSelectedViewName(selectedView?.name || '');
                // 清空后续选择
                setSelectedFieldId(undefined);
                setSelectedFieldName('');
                setFields([]);
              }}
              labelInValue={false}
              disabled={!selectedTableId || processing}
              optionLabelProp="name" // 使用 name 作为标签
            >
              {views.map(view => (
                <Option key={view.id} value={view.id} name={view.name}>
                  {view.name}
                </Option>
              ))}
            </Select>
          </div>

          {/* 字段选择 */}
          <div>
            <Text strong>选择包含视频ID的字段：</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择字段"
              loading={loading}
              value={selectedFieldId}
              onChange={(id) => {
                setSelectedFieldId(id);
                const selectedField = fields.find(field => field.id === id);
                setSelectedFieldName(selectedField?.name || '');
              }}
              labelInValue={false}
              disabled={!selectedViewId || processing}
              optionLabelProp="name" // 使用 name 作为标签
            >
              {fields.map(field => (
                <Option key={field.id} value={field.id} name={field.name}>
                  {field.name}
                </Option>
              ))}
            </Select>
          </div>

          {/* 覆盖选项 */}
          <Checkbox
            checked={overwriteExisting}
            onChange={e => setOverwriteExisting(e.target.checked)}
            disabled={processing}
          >
            覆盖已有数据（若不勾选，则只填充空白单元格）
          </Checkbox>

          {/* 处理按钮 */}
          <Button
            type="primary"
            onClick={processVideoIds}
            loading={processing}
            disabled={!selectedFieldId}
            block
          >
            开始获取视频信息
          </Button>

          {/* 进度显示 */}
          {processing && (
            <div style={{ textAlign: 'center' }}>
              <Spin />
              <div style={{ marginTop: 8 }}>
                正在处理: {progress.current}/{progress.total}
              </div>
            </div>
          )}

          {/* 错误详情显示 */}
          {!processing && Object.keys(errorDetails).length > 0 && (
            <Alert
              message="处理过程中存在错误"
              description={
                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {Object.entries(errorDetails).map(([recordId, errorMsg]) => (
                      <li key={recordId}>
                        <Text type="danger">记录 {recordId.slice(-6)}: {errorMsg}</Text>
                      </li>
                    ))}
                  </ul>
                </div>
              }
              type="error"
              showIcon
            />
          )}
        </Space>
      </div>
    );
  };

  // 条件渲染：如果初始化失败，显示错误信息
  if (initError) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="应用初始化失败"
          description={<>
            <p>{initError}</p>
            <p>请尝试刷新页面或检查网络连接。如果问题持续存在，请联系管理员。</p>
          </>}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          }
        />
      </div>
    );
  }
  
  // 显示加载状态
  if (!appReady && loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Spin size="large" />
        <p style={{ marginTop: '20px' }}>正在加载应用，请稍候...</p>
      </div>
    );
  }

  // 如果没有检测到表格，显示测试页面
  if (appReady && tables.length === 0) {
    console.log('没有检测到表格，显示测试页面');
    return renderTestPage();
  }
  
  // 调试输出
  console.log('应用状态:', { appReady, tablesLength: tables.length, loading });


  // 否则显示主应用
  return renderMainApp();
}
