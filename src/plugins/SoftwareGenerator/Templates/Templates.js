/* Generated file based on ejs templates */
define([], function() {
    return {
    "CMakeLists.txt.ejs": "cmake_minimum_required(VERSION 2.8.3)\r\nproject(<%= package.name %>)\r\n\r\n## Start Global Marker\r\n\r\n## End Global Marker\r\n\r\n## Check C++11 / C++0x\r\ninclude(CheckCXXCompilerFlag)\r\nCHECK_CXX_COMPILER_FLAG(\"-std=c++11\" COMPILER_SUPPORTS_CXX11)\r\nCHECK_CXX_COMPILER_FLAG(\"-std=c++0x\" COMPILER_SUPPORTS_CXX0X)\r\nif(COMPILER_SUPPORTS_CXX11)\r\n    set(CMAKE_CXX_FLAGS \"-std=c++11\")\r\nelseif(COMPILER_SUPPORTS_CXX0X)\r\n    set(CMAKE_CXX_FLAGS \"-std=c++0x\")\r\nelse()\r\n    message(FATAL_ERROR \"The compiler ${CMAKE_CXX_COMPILER} has no C++11 support. Please use a different C++ compiler.\")\r\nendif()\r\n\r\nADD_DEFINITIONS(-DNAMESPACE=${NAMESPACE})\r\nif (${NAMESPACE} STREQUAL \"rosmod\")\r\n  find_package(catkin REQUIRED COMPONENTS rosmod std_msgs message_generation)\r\n  ADD_DEFINITIONS(-DUSE_ROSMOD)\r\nELSEIF(${NAMESPACE} STREQUAL \"ros\")\r\n  find_package(catkin REQUIRED COMPONENTS roscpp std_msgs message_generation)\r\n  ADD_DEFINITIONS(-DUSE_ROSCPP)\r\nELSE()\r\n  message(FATAL_ERROR \"Some error something wrong\")\r\nENDIF()\r\n\r\n## System dependencies are found with CMake's conventions\r\n# find_package(Boost REQUIRED COMPONENTS system)\r\n\r\n\r\n## Uncomment this if the package has a setup.py. This macro ensures\r\n## modules and global scripts declared therein get installed\r\n## See http://ros.org/doc/api/catkin/html/user_guide/setup_dot_py.html\r\n# catkin_python_setup()\r\n\r\n#\r\n## Declare ROS messages, services and actions \r\n#\r\n\r\n## To declare and build messages, services or actions from within this\r\n## package, follow these steps:\r\n## * Let MSG_DEP_SET be the set of packages whose message types you use in\r\n##   your messages/services/actions (e.g. std_msgs, actionlib_msgs, ...).\r\n## * In the file package.xml:\r\n##   * add a build_depend and a run_depend tag for each package in MSG_DEP_SET\r\n##   * If MSG_DEP_SET isn't empty the following dependencies might have been\r\n##     pulled in transitively but can be declared for certainty nonetheless:\r\n##     * add a build_depend tag for \"message_generation\"\r\n##     * add a run_depend tag for \"message_runtime\"\r\n## * In this file (CMakeLists.txt):\r\n##   * add \"message_generation\" and every package in MSG_DEP_SET to\r\n##     find_package(catkin REQUIRED COMPONENTS ...)\r\n##   * add \"message_runtime\" and every package in MSG_DEP_SET to\r\n##     catkin_package(CATKIN_DEPENDS ...)\r\n##   * uncomment the add_*_files sections below as needed\r\n##     and list every .msg/.srv/.action file to be processed\r\n##   * uncomment the generate_messages entry below\r\n##   * add every package in MSG_DEP_SET to generate_messages(DEPENDENCIES ...)\r\n\r\n# Generate messages in the 'msg' folder\r\n\r\n# Generate services in the 'srv' folder\r\nadd_service_files(\r\n  FILES\r\n<%\r\n// All of the services\r\nfor (var i =0; i < package.services.length; i++) {\r\n-%>\r\n <%= package.services[i].name %>.srv\r\n<%\r\n}\r\n-%>\r\n)\r\n\r\n## Generate actions in the 'action' folder\r\n# add_action_files(\r\n#   FILES\r\n#   Action1.action\r\n#   Action2.action\r\n# )\r\n\r\n# Generate added messages and services with any dependencies listed here\r\ngenerate_messages(\r\n  DEPENDENCIES\r\n<%\r\n// All of the messages\r\nfor (var i =0; i < package.messages.length; i++) {\r\n-%>\r\n <%= package.messages[i].name %>.msg\r\n<%\r\n}\r\n-%>\r\n)\r\n\r\n#\r\n## catkin specific configuration \r\n#\r\n## The catkin_package macro generates cmake config files for your package\r\n## Declare things to be passed to dependent projects\r\n## INCLUDE_DIRS: uncomment this if you package contains header files\r\n## LIBRARIES: libraries you create in this project that dependent projects also need\r\n## CATKIN_DEPENDS: catkin_packages dependent projects also need\r\n## DEPENDS: system dependencies of this project that dependent projects also need\r\ncatkin_package(\r\n#  INCLUDE_DIRS include\r\n#  LIBRARIES client_server_package\r\n#  CATKIN_DEPENDS roscpp std_msgs\r\n  CATKIN_DEPENDS message_runtime\r\n#  DEPENDS system_lib\r\n)\r\n\r\n#\r\n## Build \r\n#\r\n\r\n## Specify additional locations of header files\r\n## Your package locations should be listed before other locations\r\n# include_directories(include)\r\ninclude_directories(\r\n  ../node/include\r\n  ${catkin_INCLUDE_DIRS}\r\n<%\r\n// All of the user include directories\r\nfor (var i =0; i < package.libraries.length; i++) {\r\n-%>\r\n <%= package.libararies[i].include %>\r\n<%\r\n}\r\n-%>\r\n)\r\n\r\n## Declare a cpp library\r\n# add_library(client_server_package\r\n#   src/${PROJECT_NAME}/client_server_package.cpp\r\n# )\r\n\r\n## Declare a cpp executable\r\n# add_executable(client_server_package_node src/client_server_package_node.cpp)\r\n\r\n## Add cmake target dependencies of the executable/library\r\n## as an example, message headers may need to be generated before nodes\r\n# add_dependencies(client_server_package_node client_server_package_generate_messages_cpp)\r\n\r\n## Specify libraries to link a library or executable target against\r\n# target_link_libraries(client_server_package_node\r\n#   ${catkin_LIBRARIES}\r\n# )\r\n\r\n#\r\n## Install \r\n#\r\n\r\n# all install targets should use catkin DESTINATION variables\r\n# See http://ros.org/doc/api/catkin/html/adv_user_guide/variables.html\r\n\r\n## Mark executable scripts (Python etc.) for installation\r\n## in contrast to setup.py, you can choose the destination\r\n# install(PROGRAMS\r\n#   scripts/my_python_script\r\n#   DESTINATION ${CATKIN_PACKAGE_BIN_DESTINATION}\r\n# )\r\n\r\n## Mark executables and/or libraries for installation\r\n# install(TARGETS client_server_package client_server_package_node\r\n#   ARCHIVE DESTINATION ${CATKIN_PACKAGE_LIB_DESTINATION}\r\n#   LIBRARY DESTINATION ${CATKIN_PACKAGE_LIB_DESTINATION}\r\n#   RUNTIME DESTINATION ${CATKIN_PACKAGE_BIN_DESTINATION}\r\n# )\r\n\r\n## Mark cpp header files for installation\r\n# install(DIRECTORY include/${PROJECT_NAME}/\r\n#   DESTINATION ${CATKIN_PACKAGE_INCLUDE_DESTINATION}\r\n#   FILES_MATCHING PATTERN \"*.h\"\r\n#   PATTERN \".svn\" EXCLUDE\r\n# )\r\n\r\n## Mark other files for installation (e.g. launch and bag files, etc.)\r\n# install(FILES\r\n#   # myfile1\r\n#   # myfile2\r\n#   DESTINATION ${CATKIN_PACKAGE_SHARE_DESTINATION}\r\n# )\r\n\r\n#\r\n## Testing \r\n#\r\n\r\n## Add gtest based cpp test target and link libraries\r\n# catkin_add_gtest(${PROJECT_NAME}-test test/test_client_server_package.cpp)\r\n# if(TARGET ${PROJECT_NAME}-test)\r\n#   target_link_libraries(${PROJECT_NAME}-test ${PROJECT_NAME})\r\n# endif()\r\n\r\n## Add folders to be run by python nosetests\r\n# catkin_add_nosetests(test)\r\ninclude_directories(include ${catkin_INCLUDE_DIRS})\r\n\r\n<%\r\n// All of the component libraries\r\n// need to add component's dependent library info\r\nfor (var i =0; i < package.components.length; i++) {\r\n-%>\r\nadd_library(<%= package.components[i].name %>\r\n            src/<%= package.name%>/<%= package.components[i].name %>.cpp\r\n            )\r\ntarget_link_libraries(<%= package.components[i].name %>\r\n                      ${catkin_LIBRARIES} \r\n                      )\r\nadd_dependencies(<%= package.components[i].name %>\r\n                 <%= package.name %>_generate_messages_cpp\r\n\t\t )\r\n<%\r\n}\r\n-%>\r\n",
    "component.cpp.ejs": "#include \"client_server_package/Client.hpp\"\r\n\r\n//# Start User Globals Marker\r\n#include <stdlib.h>\r\n#include <boost/random/linear_congruential.hpp>\r\n#include <boost/random/uniform_int.hpp>\r\n#include <boost/random/uniform_real.hpp>\r\n#include <boost/random/variate_generator.hpp>\r\n#include <boost/generator_iterator.hpp>\r\n#include <boost/random/mersenne_twister.hpp>\r\n//# End User Globals Marker\r\n\r\n// Initialization Function\r\n//# Start Init Marker\r\nvoid Client::init_timer_operation(const NAMESPACE::TimerEvent& event)\r\n{\r\n#ifdef USE_ROSMOD\r\n  comp_queue.ROSMOD_LOGGER->log(\"DEBUG\", \"Entering Client::init_timer_operation\");\r\n#endif\r\n  // Initialize Here\r\n  // Stop Init Timer\r\n  init_timer.stop();\r\n#ifdef USE_ROSMOD\r\n  comp_queue.ROSMOD_LOGGER->log(\"DEBUG\", \"Exiting Client::init_timer_operation\");\r\n#endif  \r\n}\r\n//# End Init Marker\r\n\r\n\r\n// Timer Callback - client_timer\r\n//# Start client_timer_operation Marker\r\n#pragma optimize( \"\", off )\r\nvoid Client::client_timer_operation(const NAMESPACE::TimerEvent& event)\r\n{\r\n#ifdef USE_ROSMOD\r\n  comp_queue.ROSMOD_LOGGER->log(\"DEBUG\", \"Entering Client::client_timer_operation\");\r\n#endif\r\n\r\n  boost::random::mt19937 rng;\r\n  boost::random::uniform_int_distribution<> loop_iteration_random(2520000, 4200000);\r\n  int loop_max = loop_iteration_random(rng);\r\n  \r\n  // Business Logic for client_timer_operation\r\n  for(int i=0; i < loop_max; i++) {\r\n    double result = 0.0;\r\n    double x = 41865185131.214415;\r\n    double y = 562056205.1515;\r\n    result = x*y;\r\n  }  \r\n  client_server_package::Power power_function;\r\n  power_function.request.base = float(rand() % 10);\r\n  power_function.request.exponent = float(rand() % 10);\r\n  logger->log(\"INFO\", \"Client::Client Timer::Sending Request to calculate %f ^ %f\", \r\n\t      power_function.request.base, \r\n\t      power_function.request.exponent);\r\n#ifdef USE_ROSMOD\r\n  comp_queue.ROSMOD_LOGGER->log(\"DEBUG\", \"BEFORE CLIENT CALL\");\r\n#endif  \r\n  if (client_port.call(power_function))\r\n    logger->log(\"INFO\", \r\n\t\t\"Client::Client Timer::Server Response - %f\", power_function.response.result);\r\n  else {\r\n    logger->log(\"ERROR\", \"Client::Client Timer::Failed to invoke Server Operation\");\r\n    client_port.waitForExistence(ros::Duration(-1));\r\n  }\r\n#ifdef USE_ROSMOD\r\n  comp_queue.ROSMOD_LOGGER->log(\"DEBUG\", \"CLIENT CALL COMPLETED\");\r\n#endif  \r\n  \r\n#ifdef USE_ROSMOD\r\n  comp_queue.ROSMOD_LOGGER->log(\"DEBUG\", \"Exiting Client::client_timer_operation\");\r\n#endif\r\n}\r\n#pragma optimize( \"\", on )\r\n//# End client_timer_operation Marker\r\n\r\n\r\n// Destructor - Cleanup Ports & Timers\r\nClient::~Client()\r\n{\r\n  client_timer.stop();\r\n  client_port.shutdown();\r\n  //# Start Destructor Marker\r\n  //# End Destructor Marker\r\n}\r\n\r\n// Startup - Setup Component Ports & Timers\r\nvoid Client::startUp()\r\n{\r\n  NAMESPACE::NodeHandle nh;\r\n  std::string advertiseName;\r\n\r\n  // Identify the pwd of Node Executable\r\n  std::string s = node_argv[0];\r\n  std::string exec_path = s;\r\n  std::string delimiter = \"/\";\r\n  std::string exec, pwd;\r\n  size_t pos = 0;\r\n  while ((pos = s.find(delimiter)) != std::string::npos) {\r\n    exec = s.substr(0, pos);\r\n    s.erase(0, pos + delimiter.length());\r\n  }\r\n  exec = s.substr(0, pos);\r\n  pwd = exec_path.erase(exec_path.find(exec), exec.length());\r\n  std::string log_file_path = pwd + config.nodeName + \".\" + config.compName + \".log\"; \r\n\r\n  logger->create_file(pwd + config.nodeName + \".\" + config.compName + \".log\");\r\n  logger->set_is_periodic(config.is_periodic_logging);\r\n  logger->set_max_log_unit(config.periodic_log_unit);\r\n\r\n#ifdef USE_ROSMOD\r\n  comp_queue.ROSMOD_LOGGER->create_file(pwd + \"ROSMOD_DEBUG.\" + config.nodeName + \".\" + config.compName + \".log\");\r\n  comp_queue.ROSMOD_LOGGER->set_is_periodic(config.is_periodic_logging);\r\n  comp_queue.ROSMOD_LOGGER->set_max_log_unit(config.periodic_log_unit);\r\n#endif    \r\n  \r\n#ifdef USE_ROSMOD \r\n  this->comp_queue.scheduling_scheme = config.schedulingScheme;\r\n  rosmod::ROSMOD_Callback_Options callback_options;\r\n#endif  \r\n\r\n  // Synchronize components now that all publishers and servers have been initialized\r\n  this->comp_sync_pub = nh.advertise<std_msgs::Bool>(\"component_synchronization\", 1000);\r\n  \r\n#ifdef USE_ROSMOD  \r\n  rosmod::SubscribeOptions comp_sync_sub_options;\r\n  rosmod::ROSMOD_Callback_Options sync_callback_options;\r\n#else\r\n  ros::SubscribeOptions comp_sync_sub_options;\r\n#endif\r\n  \r\n  comp_sync_sub_options = NAMESPACE::SubscribeOptions::create<std_msgs::Bool>\r\n    (\"component_synchronization\",\r\n     1000,\r\n     boost::bind(&Client::component_sync_operation, this, _1),\r\n     NAMESPACE::VoidPtr(),\r\n#ifdef USE_ROSMOD     \r\n     &this->comp_queue,\r\n     sync_callback_options);\r\n#else\r\n     &this->comp_queue);\r\n#endif\r\n  this->comp_sync_sub = nh.subscribe(comp_sync_sub_options);\r\n\r\n  ros::Time now = ros::Time::now();\r\n  while ( this->comp_sync_sub.getNumPublishers() < this->config.num_comps_to_sync &&\r\n\t  (ros::Time::now() - now) < ros::Duration(config.comp_sync_timeout))\r\n  ros::Duration(0.1).sleep();\r\n  ros::Duration(0.5).sleep();\r\n  this->comp_sync_sub.shutdown();  \r\n  this->comp_sync_pub.shutdown();\r\n\r\n\r\n  // Configure all required services associated with this component\r\n  // Component Client - client_port\r\n  advertiseName = \"Power\";\r\n  if (config.portGroupMap.find(\"client_port\") != config.portGroupMap.end())\r\n    advertiseName += \"_\" + config.portGroupMap[\"client_port\"];\r\n  this->client_port = nh.serviceClient<client_server_package::Power>(advertiseName.c_str(), true); \r\n\r\n  // Init Timer\r\n#ifdef USE_ROSMOD    \r\n  callback_options.alias = \"init_timer_operation\";\r\n  callback_options.priority = 99;\r\n  callback_options.deadline.sec = 1;\r\n  callback_options.deadline.nsec = 0;\r\n#endif\r\n  NAMESPACE::TimerOptions timer_options;\r\n  timer_options = \r\n    NAMESPACE::TimerOptions\r\n    (ros::Duration(-1),\r\n     boost::bind(&Client::init_timer_operation, this, _1),\r\n     &this->comp_queue,\r\n#ifdef USE_ROSMOD     \r\n     callback_options,\r\n#endif     \r\n     true,\r\n     false); \r\n  this->init_timer = nh.createTimer(timer_options);\r\n  this->init_timer.stop();\r\n#ifdef USE_ROSMOD   \r\n  callback_options.alias = \"client_timer_operation\";\r\n  callback_options.priority = 50;\r\n  callback_options.deadline.sec = 3;\r\n  callback_options.deadline.nsec = 0;\r\n#endif\r\n  // Component Timer - client_timer\r\n  timer_options = \r\n    NAMESPACE::TimerOptions\r\n    (ros::Duration(5.0),\r\n     boost::bind(&Client::client_timer_operation, this, _1),\r\n     &this->comp_queue,\r\n#ifdef USE_ROSMOD     \r\n     callback_options,\r\n#endif \r\n     false,\r\n     false);\r\n  this->client_timer = nh.createTimer(timer_options);\r\n\r\n\r\n  this->init_timer.start();\r\n  this->client_timer.start();\r\n}\r\n\r\nextern \"C\" {\r\n  Component *maker(ComponentConfig &config, int argc, char **argv) {\r\n    return new Client(config,argc,argv);\r\n  }\r\n}\r\n\r\n",
    "component.hpp.ejs": "#ifndef CLIENT_HPP\r\n#define CLIENT_HPP\r\n#include \"node/Component.hpp\"\r\n<%\r\n-%>\r\n<%\r\n-%>\r\n\r\n#ifdef USE_ROSMOD\r\n  #include \"rosmod/rosmod_ros.h\"\r\n#else\r\n  #ifdef USE_ROSCPP\r\n    #include \"ros/ros.h\"\r\n  #endif\r\n#endif\r\n\r\n// User Global Forwards\r\n<%= compInfo.forwards %>\r\n\r\nclass <%= compInfo.name %> : public Component\r\n{\r\npublic:\r\n  // Constructor\r\n  <%= compInfo.name %>(ComponentConfig& _config, int argc, char **argv)\r\n  : Component(_config, argc, argv) {}\r\n\r\n  // Initialization\r\n  void init_timer_operation(const NAMESPACE::TimerEvent& event);\r\n\r\n<%\r\nfor (var tmr in compInfo.timers) {\r\n-%>\r\n  // Timer Operation - <%= compInfo.timers[tmr].name %>\r\n  void <%= compInfo.timers[tmr].name %>_operation(const NAMESPACE::TimerEvent& event);\r\n<%\r\n}\r\n-%>\r\n\r\n  // Start up\r\n  void startUp();\r\n\r\n  // Destructor\r\n  ~<%= compInfo.name %>();\r\n\r\nprivate:\r\n\r\n<%\r\nfor (var tmr in compInfo.timers) {\r\n-%>\r\n  // <%= compInfo.timers[tmr].name %>\r\n  NAMESPACE::Timer <%= compInfo.timers[tmr].name %>;\r\n<%\r\n}\r\n-%>\r\n\r\n<%\r\nfor (var svr in compInfo.servers) {\r\n-%>\r\n  // <%= compInfo.servers[svr].name %>\r\n  NAMESPACE::ServiceServer <%= compInfo.servers[svr].name %>;\r\n<%\r\n}\r\n-%>\r\n\r\n<%\r\nfor (var clt in compInfo.clients) {\r\n -%>\r\n  // <%= compInfo.clients[clt].name %>\r\n  NAMESPACE::ServiceClient <%= compInfo.clients[clt].name %>;\r\n<%\r\n}\r\n-%>\r\n\r\n<%\r\nfor (var pub in compInfo.publishers) {\r\n -%>\r\n  // <%= compInfo.publishers[pub].name %>\r\n  NAMESPACE::Publisher <%= compInfo.publishers[pub].name %>;\r\n<%\r\n}\r\n-%>\r\n\r\n<%\r\nfor (var sub in compInfo.subscribers) {\r\n -%>\r\n  // <%= compInfo.subscribers[sub].name %>\r\n  NAMESPACE::Subscriber <%= compInfo.subscribers[sub].name %>;\r\n<%\r\n}\r\n-%>\r\n\r\n  // User Private Members\r\n  <%= compInfo.members %>\r\n};\r\n\r\n#endif\r\n\r\n"
}});