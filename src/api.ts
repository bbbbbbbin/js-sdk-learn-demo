/*
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @Date: 2025-04-26 12:55:43
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2025-04-26 18:32:56
 * @FilePath: \js-sdk-learn-demo\src\api.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import axios from 'axios';

// 定义视频信息接口
interface VideoInfo {
  id: string;
  author: string;
  sec_uid: string;
  time: string;
  caption: string;
  desc: string;
  duration: string;
  hashtags: string;
  tags: string;
  vediourl: string;
  cover: string;
  ocr: string;
  share: string;
  music: string;
  collect_count: number | string;
  comment_count: number | string;
  digg_count: number | string;
  share_count: number | string;
}

// 安全获取嵌套对象属性的函数
function safeGet(d: any, keys: string[], defaultValue: any = null) {
  if (!d || typeof d !== 'object') {
    return defaultValue;
  }
  
  let current = d;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  return current;
}

// 格式化视频时长
function formatDuration(ms: number | null | undefined) {
  if (!ms) {
    return "0:00";
  }
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 获取抖音视频信息
 * @param videoId 抖音视频ID
 * @returns 视频信息对象
 */
export async function getDouyinVideoInfo(videoId: string): Promise<VideoInfo> {
  try {
    console.log(`开始请求视频ID: ${videoId} 的信息...`);
    // 定义API端点列表 - 添加多个备选API端点
    const apiEndpoints = [
      `api/douyin/web/fetch_one_video?aweme_id=${videoId}`
    ];
    
    let response = null;
    let error = null;
    let errorMessages: string[] = [];
    
    // 尝试所有API端点
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`尝试请求API端点: ${endpoint}`);
        // 添加超时和错误处理
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 增加到20秒超时
        
        // 实现简单的重试逻辑
        let retryCount = 0;
        const maxRetries = 2; // 最多重试2次
        let lastError = null;
        let res = null;
        
        try {
          while (retryCount <= maxRetries) {
            try {
              if (retryCount > 0) {
                console.log(`第${retryCount}次重试请求API端点: ${endpoint}`);
                // 重试时增加延迟，避免立即重试
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              }
              
              const api = axios.create({
                baseURL: '/api'
                }
              )

              res = await api.get(endpoint, {
                timeout: 15000, // 15秒超时
                signal: controller.signal,
                maxRedirects: 5,
                headers: {
                  //'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
              });
              
              if (res.data) {
                console.log(`API请求成功: ${endpoint}`);
                break; // 成功则跳出重试循环
              }
              // 如果没有数据但没有报错，增加重试次数
              retryCount++;
              if (retryCount > maxRetries) break;
            } catch (retryErr: any) {
              lastError = retryErr;
              if (retryErr.message && (retryErr.message.includes('Network Error') || retryErr.code === 'ECONNABORTED')) {
                // 只有网络错误或超时才重试
                retryCount++;
                if (retryCount <= maxRetries) {
                  console.log(`请求失败，准备第${retryCount}次重试: ${retryErr.message}`);
                  continue;
                }
              }
              // 其他错误或重试次数已达上限，跳出重试循环
              break;
            }
          }
        } finally {
          clearTimeout(timeoutId);
        }
        
        // 所有重试都失败，抛出最后一个错误
        if (!res && lastError) {
          throw lastError;
        }
        
        // 如果成功获取到数据
        if (res && res.data) {
          response = res.data;
          break; // 跳出外层循环，不再尝试其他API端点
        }
      } catch (err: any) {
        // 增强错误处理
        error = err;
        let errorMsg = '';
        if (err?.code === 'ECONNABORTED') {
          errorMsg = '请求超时';
        } else if (err?.message?.includes('Network Error')) {
          errorMsg = '网络错误，可能是服务器不可达、断网或跨域（CORS）问题';
        } else if (err?.response) {
          errorMsg = `HTTP错误: ${err.response.status} ${err.response.statusText}`;
        } else if (err?.message) {
          errorMsg = err.message;
        } else {
          errorMsg = '未知错误';
        }
        errorMessages.push(`${endpoint}: ${errorMsg}`);
        console.error(`API请求失败: ${endpoint}`, err);
        // 继续尝试下一个API
      }
    }
    
    if (!response) {
      console.error('所有API端点请求均失败:', errorMessages.join('; '));
      // 增强错误信息，包含详细的错误堆栈和所有尝试的端点
      throw error || new Error(`所有API端点请求均失败: ${errorMessages.join('; ')}`);
    }
    
    console.log(`成功获取到API响应数据`);
    // 提取视频信息
    let awemeDetail = {};
    
    // 检查响应数据结构，适应不同的API返回格式
    if (response.data) {
      console.log('检查API响应数据结构...');
      if (response.data.aweme_detail) {
        console.log('找到标准格式的aweme_detail字段');
        awemeDetail = response.data.aweme_detail;
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        console.log('找到数组格式的响应数据');
        awemeDetail = response.data[0];
      } else {
        console.log('使用整个data对象作为视频详情');
        awemeDetail = response.data;
      }
    } else if (response.aweme_detail) {
      console.log('在响应根级别找到aweme_detail字段');
      awemeDetail = response.aweme_detail;
    } else {
      console.log('未找到标准数据结构，尝试使用整个响应对象');
      awemeDetail = response;
    }
    
    console.log('开始从视频详情中提取所需信息...');
    const videoData = safeGet(awemeDetail, ['video'], {});
    const bitRates = safeGet(videoData, ['bit_rate'], []);
    const author = safeGet(awemeDetail, ['author'], {});
    const seoInfo = safeGet(awemeDetail, ['seo_info'], {});
    const shareInfoDetail = safeGet(awemeDetail, ['share_info'], {});

    // 获取视频URL
    let videoUrl = '';
    if (bitRates && bitRates.length > 0) {
      const urlList = safeGet(bitRates[0], ['play_addr', 'url_list'], []);
      if (urlList.length > 0) {
        videoUrl = urlList[0];
      }
    }
    
    if (!videoUrl) {
      const directUrlList = safeGet(videoData, ['play_addr', 'url_list'], []);
      if (directUrlList && directUrlList.length > 0) {
        videoUrl = directUrlList[0];
      }
      
      if (!videoUrl) {
        const downloadUrlList = safeGet(videoData, ['download_addr', 'url_list'], []);
        if (downloadUrlList && downloadUrlList.length > 0) {
          videoUrl = downloadUrlList[0];
        }
      }
      
      if (!videoUrl) {
        videoUrl = safeGet(awemeDetail, ['video_url'], '');
      }
    }

    // 获取封面URL
    let coverUrl = '';
    const coverOriginalScale = safeGet(videoData, ['cover_original_scale'], {});
    if (coverOriginalScale) {
      const urlList = safeGet(coverOriginalScale, ['url_list'], []);
      if (urlList && urlList.length > 0) {
        coverUrl = urlList[0];
      }
    }
    
    if (!coverUrl) {
      const coverUrlList = safeGet(videoData, ['cover', 'url_list'], []);
      if (coverUrlList && coverUrlList.length > 0) {
        coverUrl = coverUrlList[0];
      }
      
      if (!coverUrl) {
        const dynamicCoverUrlList = safeGet(videoData, ['dynamic_cover', 'url_list'], []);
        if (dynamicCoverUrlList && dynamicCoverUrlList.length > 0) {
          coverUrl = dynamicCoverUrlList[0];
        }
      }
      
      if (!coverUrl) {
        coverUrl = safeGet(awemeDetail, ['cover_url'], '');
      }
    }

    // 获取视频标签
    const videoTags: string[] = [];
    const videoTagList = safeGet(awemeDetail, ['video_tag'], []);
    for (const tag of videoTagList) {
      const tagName = safeGet(tag, ['tag_name'], '');
      if (tagName) {
        videoTags.push(tagName);
      }
    }

    // 获取话题标签
    let hashtags = '';
    const textExtras = safeGet(awemeDetail, ['text_extra'], []);
    if (textExtras && textExtras.length > 0) {
      hashtags = textExtras
        .filter((te: any) => safeGet(te, ['hashtag_name']))
        .map((te: any) => safeGet(te, ['hashtag_name'], ''))
        .join(', ');
    }
    
    if (!hashtags) {
      const altHashtags = safeGet(awemeDetail, ['hashtags'], []);
      if (Array.isArray(altHashtags) && altHashtags.length > 0) {
        hashtags = altHashtags.join(', ');
      }
    }

    // 获取发布时间
    let formattedTime = '';
    const createTime = safeGet(awemeDetail, ['create_time'], 0);
    if (createTime) {
      try {
        formattedTime = new Date(createTime * 1000).toISOString().replace('T', ' ').substring(0, 19);
      } catch (timeErr) {
        console.log(`时间格式化错误: ${String(timeErr)}`);
      }
    }
    
    if (!formattedTime) {
      const publishTime = safeGet(awemeDetail, ['publish_time'], 0);
      if (publishTime) {
        try {
          formattedTime = new Date(publishTime * 1000).toISOString().replace('T', ' ').substring(0, 19);
        } catch (timeErr) {
          console.log(`时间格式化错误: ${String(timeErr)}`);
        }
      }
      
      if (!formattedTime) {
        formattedTime = safeGet(awemeDetail, ['create_time_str'], '') || 
                       safeGet(awemeDetail, ['publish_time_str'], '');
      }
    }

    // 获取音乐URL
    let musicUrl = '';
    const musicPlayUrl = safeGet(awemeDetail, ['music', 'play_url', 'uri'], '');
    if (musicPlayUrl) {
      musicUrl = musicPlayUrl;
    }
    
    if (!musicUrl) {
      musicUrl = safeGet(awemeDetail, ['music_url'], '') || 
                 safeGet(awemeDetail, ['music', 'url'], '') || 
                 safeGet(awemeDetail, ['music', 'play_url', 'url'], '');
    }
    
    // 获取作者信息
    let authorName = safeGet(author, ['nickname'], '');
    if (!authorName) {
      authorName = safeGet(awemeDetail, ['author_name'], '') || 
                  safeGet(awemeDetail, ['author_user_name'], '') || 
                  safeGet(awemeDetail, ['author', 'name'], '');
    }
    
    // 获取视频描述
    let description = safeGet(awemeDetail, ['desc'], '');
    if (!description) {
      description = safeGet(awemeDetail, ['description'], '') || 
                   safeGet(awemeDetail, ['content'], '') || 
                   safeGet(awemeDetail, ['text'], '');
    }
    
    // 构建返回数据
    return {
      id: videoId,
      author: authorName || '未知作者',
      sec_uid: safeGet(author, ['sec_uid'], ''),
      time: formattedTime || '未知时间',
      caption: safeGet(awemeDetail, ['caption'], ''),
      desc: description || '',
      duration: formatDuration(safeGet(awemeDetail, ['duration'], 0)),
      hashtags: (textExtras && textExtras.length > 0) ? textExtras.filter((te: any) => safeGet(te, ['hashtag_name'])).map((te: any) => safeGet(te, ['hashtag_name'], '')).join(', ') : (hashtags || ''),
      tags: videoTags.length > 0 ? videoTags.join(', ') : '',
      vediourl: videoUrl || '',
      cover: coverUrl || '',
      ocr: safeGet(seoInfo, ['ocr_content'], ''),
      share: safeGet(shareInfoDetail, ['share_link_desc'], ''),
      music: musicUrl || '',
      collect_count: safeGet(awemeDetail, ['statistics', 'collect_count'], ''),
      comment_count: safeGet(awemeDetail, ['statistics', 'comment_count'], ''),
      digg_count: safeGet(awemeDetail, ['statistics', 'digg_count'], ''),
      share_count: safeGet(awemeDetail, ['statistics', 'share_count'], ''),
    };

  } catch (error: any) {
    console.error('获取抖音视频信息失败:', error);
    // 返回带有更详细错误信息的对象
    let errorMsg = error instanceof Error ? error.message : '未知错误';
    let errorStack = error instanceof Error && error.stack ? error.stack : '';
    let networkTip = '请检查您的网络环境，或尝试切换网络，或联系管理员。';
    
    // 增强错误类型判断
    let errorDesc = '';
    if (errorMsg.includes('Network Error')) {
      errorDesc = '网络错误，可能是服务器不可达、断网或跨域（CORS）问题。建议检查浏览器控制台的网络请求详情，或尝试切换网络环境。';
    } else if (errorMsg.includes('ECONNABORTED') || errorMsg.includes('timeout')) {
      errorDesc = '请求超时，服务器无响应。请检查目标服务器是否可用，或稍后重试。';
    } else if (errorMsg.includes('所有API端点请求均失败')) {
      errorDesc = '所有API服务器均无法连接，请检查网络连接或稍后再试。';
    } else if (errorMsg.includes('aborted')) {
      errorDesc = '请求被中止，可能是由于网络不稳定或请求超时。';
    } else {
      errorDesc = networkTip;
    }
    
    return {
      id: videoId,
      sec_uid: '',
      author: '获取失败',
      time: '',
      caption: '',
      desc: `获取视频信息失败: ${errorMsg}\n${errorDesc}`,
      duration: '0:00',
      hashtags: '',
      tags: '',
      vediourl: '',
      cover: '',
      ocr: '',
      share: '',
      music: '',
      collect_count: '',
      comment_count: '',
      digg_count: '',
      share_count: '',
    };
  }
}
